process.env.JWT_SECRET = 'test_secret';
if (process.env.NODE_ENV !== 'test') throw new Error('Test environment required');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Order, Invoice, SalesCreditNote, TreasuryTransaction, Product, Customer } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
const { cents } = require('../src/utils/money');
let token, warehouseToken, distributorToken, customer, product, counter = 0;
beforeAll(async () => {
  if (sequelize.getDialect() !== 'sqlite' || sequelize.options.storage !== ':memory:') throw new Error('Isolated SQLite required');
  await sequelize.sync({ force: true });
  await seedRoles();
  token = tokenFor(await createUser({ email: 'cancel-finance@example.test' }));
  warehouseToken = tokenFor(await createUser({ email: 'cancel-wh@example.test', roleName: 'warehouse_keeper' }));
  distributorToken = tokenFor(await createUser({ email: 'cancel-dist@example.test', roleName: 'distributor' }));
});
beforeEach(async () => {
  customer = await Customer.create({ full_name: 'Finance customer', phone: '09120000000', credit_limit: 1000 });
  product = await Product.create({ sku: `FIN-${++counter}`, name: 'Finance product', unit_price: 100, stock_quantity: 10 });
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => sequelize.close());
function api(method, path, body, auth = token) {
  return request(app)[method](path).set('Authorization', `Bearer ${auth}`).send(body);
}
async function fixture(paid = 0) {
  const order = await api('post', '/api/orders', { customer_id: customer.id, items: [{ product_id: product.id, quantity: 2 }] });
  expect(order.status).toBe(201);
  const invoice = await api('post', '/api/invoices', { order_id: order.body.id, tax_rate: 9 });
  expect(invoice.status).toBe(201);
  if (paid) {
    const receipt = await api('post', '/api/treasury', { type: 'receipt', method: 'cash', amount: paid, invoice_id: invoice.body.id });
    expect(receipt.status).toBe(201); // no customer_id: ownership comes from invoice
  }
  return { order: order.body, invoice: invoice.body };
}
function cancel(id, extra = {}, auth = token) {
  return api('patch', `/api/orders/${id}/status`, { status: 'cancelled', confirmed_not_dispatched: true, ...extra }, auth);
}
test.each([0, 80, 218])('cancellation with receipt %s preserves originals and balances account', async (paid) => {
  const { order, invoice } = await fixture(paid);
  const beforeInvoice = (await Invoice.findByPk(invoice.id)).toJSON();
  const beforeReceipts = (await TreasuryTransaction.findAll({ where: { invoice_id: invoice.id } })).map(r => r.toJSON());
  expect((await cancel(order.id)).status).toBe(200);
  const note = await SalesCreditNote.findOne({ where: { invoice_id: invoice.id } });
  expect(Number(note.total_amount)).toBe(218);
  expect(Number(note.tax_amount)).toBe(18);
  expect(note.confirmed_not_dispatched).toBe(true);
  expect(note.created_by).toBeTruthy();
  expect((await product.reload()).stock_quantity).toBe(10);
  expect((await Invoice.findByPk(invoice.id)).toJSON()).toEqual(beforeInvoice);
  expect((await TreasuryTransaction.findAll({ where: { invoice_id: invoice.id } })).map(r => r.toJSON())).toEqual(beforeReceipts);
  const usage = await api('get', `/api/customers/${customer.id}/credit-usage`);
  expect(usage.body).toMatchObject({ outstanding_balance: 0, credit_balance: paid, account_balance: paid ? -paid : 0, unpaid_invoices: 0 });
  const statement = await api('get', `/api/customers/${customer.id}/statement`);
  expect(statement.body.closing_balance).toBe(paid ? -paid : 0);
  expect(statement.body.entries.filter(e => e.type === 'sales_credit_note')).toHaveLength(1);
  expect((await cancel(order.id)).status).toBe(400);
  expect(await SalesCreditNote.count({ where: { invoice_id: invoice.id } })).toBe(1);
  expect((await product.reload()).stock_quantity).toBe(10);
  const overview = await api('get', '/api/reports/overview');
  expect(overview.body.outstanding_receivables).toBe(0);
});
test('credit insertion failure rolls back stock, compensation flag and cancellation', async () => {
  const { order } = await fixture();
  jest.spyOn(SalesCreditNote, 'create').mockRejectedValueOnce(new Error('injected credit failure'));
  expect((await cancel(order.id)).status).toBe(500);
  const saved = await Order.findByPk(order.id);
  expect(saved.status).toBe('pending');
  expect(saved.stock_compensated).toBe(false);
  expect((await product.reload()).stock_quantity).toBe(8);
  expect(await SalesCreditNote.count({ where: { order_id: order.id } })).toBe(0);
});
test('failure after posting credit rolls the credit back too', async () => {
  const { order } = await fixture();
  jest.spyOn(Order.prototype, 'update').mockRejectedValueOnce(new Error('injected order failure'));
  expect((await cancel(order.id)).status).toBe(500);
  expect(await SalesCreditNote.count({ where: { order_id: order.id } })).toBe(0);
  expect((await product.reload()).stock_quantity).toBe(8);
});
test.each([undefined, false, 'true'])('requires literal confirmation: %s', async (value) => {
  const { order } = await fixture();
  expect((await cancel(order.id, { confirmed_not_dispatched: value })).status).toBe(400);
  expect((await product.reload()).stock_quantity).toBe(8);
  expect(await SalesCreditNote.count({ where: { order_id: order.id } })).toBe(0);
});
test('warehouse can attest; distributor cannot cancel', async () => {
  const { order } = await fixture();
  expect((await cancel(order.id, {}, distributorToken)).status).toBe(403);
  expect((await cancel(order.id, {}, warehouseToken)).status).toBe(200);
});
test.each(['out_for_delivery', 'delivered'])('cannot cancel %s even with attestation', async state => {
  const { order } = await fixture();
  for (const next of ['confirmed', 'processing', 'out_for_delivery', ...(state === 'delivered' ? ['delivered'] : [])]) {
    expect((await api('patch', `/api/orders/${order.id}/status`, { status: next })).status).toBe(200);
  }
  expect((await cancel(order.id)).status).toBe(400);
  expect(await SalesCreditNote.count({ where: { order_id: order.id } })).toBe(0);
  expect((await product.reload()).stock_quantity).toBe(8);
});
test('unique database constraint rejects duplicate credit independently of service', async () => {
  const { order } = await fixture();
  await cancel(order.id);
  const note = (await SalesCreditNote.findOne({ where: { order_id: order.id } })).toJSON();
  delete note.id;
  note.credit_number = 'DUPLICATE-ATTEMPT';
  await expect(SalesCreditNote.create(note)).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
});
test('fractional invoice snapshots cancel without rounding loss', async () => {
  const { order, invoice } = await fixture(0.1);
  await Invoice.update({ subtotal: '200.01', tax_amount: '18.02', total_amount: '218.03' }, { where: { id: invoice.id } });
  expect((await cancel(order.id)).status).toBe(200);
  expect(cents((await SalesCreditNote.findOne({ where: { order_id: order.id } })).total_amount)).toBe(21803n);
  expect((await api('get', `/api/customers/${customer.id}/credit-usage`)).body.account_balance).toBe(-0.1);
});
test('cannot issue a new invoice after cancelling an uninvoiced order', async () => {
  const res = await api('post', '/api/orders', { customer_id: customer.id, items: [{ product_id: product.id, quantity: 1 }] });
  expect((await cancel(res.body.id)).status).toBe(200);
  expect((await api('post', '/api/invoices', { order_id: res.body.id })).status).toBe(400);
  expect(await SalesCreditNote.count({ where: { order_id: res.body.id } })).toBe(0);
});
test('past cancelled orders are not repaired by retrying cancellation', async () => {
  const { order } = await fixture();
  await Order.update({ status: 'cancelled' }, { where: { id: order.id } });
  expect((await cancel(order.id)).status).toBe(400);
  expect(await SalesCreditNote.count({ where: { order_id: order.id } })).toBe(0);
});
test('credit document is traceable through the invoice API', async () => {
  const { order, invoice } = await fixture();
  await cancel(order.id);
  const res = await api('get', `/api/invoices/${invoice.id}`);
  expect(res.status).toBe(200);
  expect(res.body.SalesCreditNote).toMatchObject({ order_id: order.id, invoice_id: invoice.id, status: 'posted' });
});
test('voided receipts create no customer credit after cancellation', async () => {
  const { order, invoice } = await fixture(80);
  const receipt = await TreasuryTransaction.findOne({ where: { invoice_id: invoice.id } });
  expect((await api('patch', `/api/treasury/${receipt.id}/void`)).status).toBe(200);
  await cancel(order.id);
  expect((await api('get', `/api/customers/${customer.id}/credit-usage`)).body.account_balance).toBe(0);
});
test('credit offsets other invoices without double counting receipts', async () => {
  const first = await fixture(80);
  await cancel(first.order.id);
  await fixture();
  const res = await api('get', `/api/customers/${customer.id}/credit-usage`);
  expect(res.body).toMatchObject({ outstanding_balance: 138, account_balance: 138, credit_balance: 0 });
});
test('invalid invoice totals fail closed without stock or credit changes', async () => {
  const { order, invoice } = await fixture();
  await Invoice.update({ total_amount: 999 }, { where: { id: invoice.id } });
  expect((await cancel(order.id)).status).toBe(409);
  expect((await product.reload()).stock_quantity).toBe(8);
  expect((await Order.findByPk(order.id)).status).toBe('pending');
  expect(await SalesCreditNote.count({ where: { order_id: order.id } })).toBe(0);
});

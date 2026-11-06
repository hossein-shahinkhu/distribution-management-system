process.env.JWT_SECRET = 'test_secret';
if (process.env.NODE_ENV !== 'test') throw new Error('Test environment required');
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Order, Invoice, TreasuryTransaction, Product, Customer, Supplier, PurchaseInvoice } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
let token, warehouseToken, customer, other, invoice, order, counter = 0;
beforeAll(async () => {
  if (sequelize.getDialect() !== 'sqlite' || sequelize.options.storage !== ':memory:') throw new Error('Isolated SQLite required');
  await sequelize.sync({ force: true });
  await seedRoles();
  token = tokenFor(await createUser({ email: 'financial-guards@example.test' }));
  warehouseToken = tokenFor(await createUser({ email: 'financial-guards-wh@example.test', roleName: 'warehouse_keeper' }));
});
function api(method, path, body, auth = token) {
  return request(app)[method](path).set('Authorization', `Bearer ${auth}`).send(body);
}
function receipt(extra = {}) {
  return api('post', '/api/treasury', { type: 'receipt', amount: 80, method: 'cash', invoice_id: invoice.id, ...extra });
}
function cancel() {
  return api('patch', `/api/orders/${order.id}/status`, { status: 'cancelled', confirmed_not_dispatched: true });
}
beforeEach(async () => {
  customer = await Customer.create({ full_name: 'Owner', phone: '09120000000' });
  other = await Customer.create({ full_name: 'Other', phone: '09121111111' });
  const product = await Product.create({ sku: `GUARD-${++counter}`, name: 'Guard', unit_price: 100, stock_quantity: 10 });
  const created = await api('post', '/api/orders', { customer_id: customer.id, items: [{ product_id: product.id, quantity: 2 }] });
  expect(created.status).toBe(201);
  order = created.body;
  const result = await api('post', '/api/invoices', { order_id: order.id, tax_rate: 0 });
  expect(result.status).toBe(201);
  invoice = result.body;
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => sequelize.close());

test.each(['paid', 'partial', 'unpaid'])('manual %s is rejected without modifying documents', async payment_status => {
  const before = (await Invoice.findByPk(invoice.id)).toJSON();
  const result = await api('patch', `/api/invoices/${invoice.id}/payment-status`, { payment_status });
  expect(result.status).toBe(409);
  expect(result.body.code).toBe('MANUAL_PAYMENT_STATUS_DISABLED');
  expect((await Invoice.findByPk(invoice.id)).toJSON()).toEqual(before);
  expect(await TreasuryTransaction.count({ where: { invoice_id: invoice.id } })).toBe(0);
});
test('receipt after credit is rejected and earlier receipt is unchanged', async () => {
  const first = await receipt();
  expect(first.status).toBe(201);
  const original = (await TreasuryTransaction.findByPk(first.body.id)).toJSON();
  expect((await cancel()).status).toBe(200);
  expect((await receipt()).status).toBe(409);
  expect(await TreasuryTransaction.count({ where: { invoice_id: invoice.id } })).toBe(1);
  expect((await TreasuryTransaction.findByPk(first.body.id)).toJSON()).toEqual(original);
  const usage = await api('get', `/api/customers/${customer.id}/credit-usage`);
  expect(usage.body.account_balance).toBe(-80);
});
test('mismatched customer is rejected; omitted owner is derived and stored', async () => {
  expect((await receipt({ customer_id: other.id })).status).toBe(422);
  expect(await TreasuryTransaction.count({ where: { invoice_id: invoice.id } })).toBe(0);
  const result = await receipt();
  expect(result.status).toBe(201);
  expect(result.body.customer_id).toBe(customer.id);
});
test('sales payments, mixed invoice types and purchase receipts are rejected', async () => {
  const supplier = await Supplier.create({ name: 'Supplier', phone: '09122222222' });
  const purchase = await PurchaseInvoice.create({ invoice_number: `GUARD-PI-${counter}`, supplier_id: supplier.id, subtotal: 200, total_amount: 200 });
  expect((await receipt({ type: 'payment' })).status).toBe(422);
  expect((await receipt({ purchase_invoice_id: purchase.id })).status).toBe(422);
  expect((await receipt({ invoice_id: null, purchase_invoice_id: purchase.id })).status).toBe(422);
  expect((await purchase.reload()).payment_status).toBe('unpaid');
  expect(await TreasuryTransaction.count({ where: { purchase_invoice_id: purchase.id } })).toBe(0);
});
test('generic customer payment cannot be disguised with a reference string', async () => {
  for (const reference_number of [undefined, 'refund-looking-reference']) {
    const result = await api('post', '/api/treasury', { type: 'payment', amount: 80, method: 'cash', customer_id: customer.id, reference_number });
    expect(result.status).toBe(403);
  }
  expect(await TreasuryTransaction.count({ where: { customer_id: customer.id } })).toBe(0);
});
test('legitimate unlinked operating payment remains allowed; unauthorized role is denied', async () => {
  const data = { type: 'payment', amount: 20, method: 'cash', description: 'Office supplies' };
  expect((await api('post', '/api/treasury', data, warehouseToken)).status).toBe(403);
  expect((await api('post', '/api/treasury', data)).status).toBe(201);
});
test('valid partial/full receipts and voiding keep status synchronized', async () => {
  const first = await receipt({ customer_id: String(customer.id) });
  expect(first.status).toBe(201);
  expect((await Invoice.findByPk(invoice.id)).payment_status).toBe('partial');
  const second = await receipt({ amount: 120 });
  expect(second.status).toBe(201);
  expect((await Invoice.findByPk(invoice.id)).payment_status).toBe('paid');
  expect((await api('patch', `/api/treasury/${second.body.id}/void`)).status).toBe(200);
  expect((await Invoice.findByPk(invoice.id)).payment_status).toBe('partial');
});
test('receipt insertion rolls back when payment synchronization fails', async () => {
  jest.spyOn(Invoice.prototype, 'update').mockRejectedValueOnce(new Error('injected status failure'));
  expect((await receipt()).status).toBe(500);
  expect(await TreasuryTransaction.count({ where: { invoice_id: invoice.id } })).toBe(0);
  expect((await Invoice.findByPk(invoice.id)).payment_status).toBe('unpaid');
});
test('receipt void rolls back when synchronization fails', async () => {
  const first = await receipt();
  jest.spyOn(Invoice.prototype, 'update').mockRejectedValueOnce(new Error('injected void failure'));
  expect((await api('patch', `/api/treasury/${first.body.id}/void`)).status).toBe(500);
  expect((await TreasuryTransaction.findByPk(first.body.id)).is_voided).toBe(false);
  expect((await Invoice.findByPk(invoice.id)).payment_status).toBe('partial');
});
test('receipt rendering failure before commit rolls back the receipt and status', async () => {
  jest.spyOn(TreasuryTransaction.prototype, 'reload').mockRejectedValueOnce(new Error('injected reload failure'));
  expect((await receipt()).status).toBe(500);
  expect(await TreasuryTransaction.count({ where: { invoice_id: invoice.id } })).toBe(0);
  expect((await Invoice.findByPk(invoice.id)).payment_status).toBe('unpaid');
});
test('full cancellation credit blocks collection even if a legacy order was reopened', async () => {
  expect((await cancel()).status).toBe(200);
  await Order.update({ status: 'pending' }, { where: { id: order.id } }); // isolated corrupt-data fixture
  expect((await receipt()).status).toBe(409);
  expect(await TreasuryTransaction.count({ where: { invoice_id: invoice.id } })).toBe(0);
});
test('invalid monetary precision is rejected before writing a receipt', async () => {
  expect((await receipt({ amount: '0.001' })).status).toBe(422);
  expect(await TreasuryTransaction.count({ where: { invoice_id: invoice.id } })).toBe(0);
});

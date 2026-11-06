process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Invoice, TreasuryTransaction, SalesCreditNote, Product, Customer } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
const { calculateInvoiceFinancials } = require('../src/services/invoiceFinancialService');
let token, customer, product, count = 0;
beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || sequelize.getDialect() !== 'sqlite' || sequelize.options.storage !== ':memory:') throw new Error('Isolated test database required');
  await sequelize.sync({ force: true }); await seedRoles();
  token = tokenFor(await createUser({ email: 'financial-view@example.test' }));
});
beforeEach(async () => {
  customer = await Customer.create({ full_name: `FINVIEW-${++count}`, phone: '09120000000', credit_limit: 1000 });
  product = await Product.create({ sku: `FINVIEW-${count}`, name: 'View product', unit_price: 100, stock_quantity: 50 });
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => sequelize.close());
const api = (method, url, body) => request(app)[method](url).set('Authorization', `Bearer ${token}`).send(body);
async function fixture(received = 0, cancelled = false) {
  const order = await api('post', '/api/orders', { customer_id: customer.id, items: [{ product_id: product.id, quantity: 2 }] });
  expect(order.status).toBe(201);
  const invoice = await api('post', '/api/invoices', { order_id: order.body.id, tax_rate: 0 });
  expect(invoice.status).toBe(201);
  expect(invoice.body).toMatchObject({ original_total: 200, received_amount: 0, document_status: 'active', settlement_status: 'unpaid' });
  if (received) expect((await api('post', '/api/treasury', { type: 'receipt', method: 'cash', amount: received, invoice_id: invoice.body.id })).status).toBe(201);
  if (cancelled) expect((await api('patch', `/api/orders/${order.body.id}/status`, { status: 'cancelled', confirmed_not_dispatched: true })).status).toBe(200);
  return { order: order.body, invoice: invoice.body };
}
test.each([
  [0, false, 'active', 'unpaid', 200, 0],
  [80, false, 'active', 'partial', 120, 0],
  [200, false, 'active', 'paid', 0, 0],
  [0, true, 'cancelled', 'not_due', 0, 0],
  [80, true, 'cancelled', 'credit', 0, 80],
  [200, true, 'cancelled', 'credit', 0, 200],
])('financial view: received %s, cancelled %s', async (received, cancelled, document, settlement, outstanding, credit) => {
  const { order, invoice } = await fixture(received, cancelled);
  const detail = await api('get', `/api/invoices/${invoice.id}`);
  expect(detail.status).toBe(200);
  expect(detail.body).toMatchObject({ original_total: 200, credited_total: cancelled ? 200 : 0,
    net_total: cancelled ? 0 : 200, received_amount: received, outstanding_amount: outstanding,
    credit_balance: credit, document_status: document, settlement_status: settlement });
  const orderView = await api('get', `/api/orders/${order.id}`);
  expect(orderView.body.Invoice).toMatchObject({ invoice_number: invoice.invoice_number, document_status: document, outstanding_amount: outstanding });
  if (cancelled) expect(orderView.body.Invoice.SalesCreditNote.credit_number).toBeTruthy();
  const usage = await api('get', `/api/customers/${customer.id}/credit-usage`);
  expect(usage.body).toMatchObject({ outstanding_balance: outstanding, credit_balance: credit });
});
test('active filters exclude cancellation and summary includes partial receipts', async () => {
  await fixture(80, true);
  const active = await fixture(80);
  const query = `search=${customer.full_name}&include_summary=true`;
  const partial = await api('get', `/api/invoices?${query}&settlement_status=partial`);
  expect(partial.body.data.map(i => i.id)).toEqual([active.invoice.id]);
  expect(partial.body.summary).toMatchObject({ count: 1, received_amount: 80, outstanding_amount: 120 });
  const cancelled = await api('get', `/api/invoices?${query}&document_status=cancelled`);
  expect(cancelled.body.summary).toMatchObject({ count: 1, credited_total: 200, received_amount: 80, outstanding_amount: 0, credit_balance: 80 });
});
test('legacy payment_status is not the effective financial state', async () => {
  const { invoice } = await fixture();
  await Invoice.update({ payment_status: 'paid' }, { where: { id: invoice.id } });
  const result = await api('get', `/api/invoices/${invoice.id}`);
  expect(result.body).toMatchObject({ payment_status: 'paid', settlement_status: 'unpaid', outstanding_amount: 200 });
  expect((await Invoice.findByPk(invoice.id)).payment_status).toBe('paid'); // no historical rewrite
});
test('unpaid and paid filters only include active invoices', async () => {
  await fixture(0, true);
  const unpaid = await fixture();
  const paid = await fixture(200);
  const query = `search=${customer.full_name}`;
  expect((await api('get', `/api/invoices?${query}&settlement_status=unpaid`)).body.map(i => i.id)).toEqual([unpaid.invoice.id]);
  expect((await api('get', `/api/invoices?${query}&settlement_status=paid`)).body.map(i => i.id)).toEqual([paid.invoice.id]);
});
test('voided receipts are excluded from financial outputs', async () => {
  const { invoice } = await fixture(80);
  const receipt = await TreasuryTransaction.findOne({ where: { invoice_id: invoice.id } });
  await api('patch', `/api/treasury/${receipt.id}/void`);
  expect((await api('get', `/api/invoices/${invoice.id}`)).body).toMatchObject({ received_amount: 0, outstanding_amount: 200, settlement_status: 'unpaid' });
});
test('date-only end includes credit and receipt at end of the selected day', async () => {
  const { invoice } = await fixture(80, true);
  await Invoice.update({ issue_date: '2026-06-01T01:00:00.000Z' }, { where: { id: invoice.id } });
  await TreasuryTransaction.update({ transaction_date: '2026-06-01T23:59:59.900Z' }, { where: { invoice_id: invoice.id } });
  await SalesCreditNote.update({ posted_at: '2026-06-01T23:59:59.999Z' }, { where: { invoice_id: invoice.id } });
  const response = await api('get', `/api/customers/${customer.id}/statement?from=2026-06-01&to=2026-06-01`);
  expect(response.body.entries).toHaveLength(3);
  expect(response.body).toMatchObject({ closing_balance: -80, outstanding_balance: 0, credit_balance: 80 });
});
test('fractional totals are exact and unrelated receipts have no effect', () => {
  expect(calculateInvoiceFinancials({ id: 1, total_amount: '0.30' }, [], [
    { invoice_id: 1, type: 'receipt', amount: '0.10', is_voided: false },
    { invoice_id: 2, type: 'receipt', amount: '0.20', is_voided: false },
  ])).toMatchObject({ received_amount: 0.1, outstanding_amount: 0.2, settlement_status: 'partial' });
});
test('list failures return a clear non-success response', async () => {
  jest.spyOn(Invoice, 'findAll').mockRejectedValueOnce(new Error('injected read failure'));
  const response = await api('get', '/api/invoices?include_summary=true');
  expect(response.status).toBe(500);
  expect(response.body.message).toBeTruthy();
});

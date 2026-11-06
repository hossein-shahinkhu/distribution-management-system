process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Order, Invoice, Customer, SalesCreditNote, TreasuryTransaction } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
let users, tokens, customer, own, cancelled, other, unassigned;
beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || sequelize.getDialect() !== 'sqlite' || sequelize.options.storage !== ':memory:') throw new Error('Isolated SQLite required');
  await sequelize.sync({ force: true }); await seedRoles();
  users = {}; tokens = {};
  for (const [key, roleName] of [['admin', 'admin'], ['a', 'salesperson'], ['b', 'salesperson'], ['warehouse', 'warehouse_keeper'], ['distributor', 'distributor']]) {
    users[key] = await createUser({ roleName, email: `invoice-access-${key}@example.test` });
    tokens[key] = tokenFor(users[key]);
  }
  customer = await Customer.create({ full_name: 'Shared customer', phone: '09120000000' });
  async function make(name, owner, total) {
    const order = await Order.create({ order_number: `ACCESS-${name}`, customer_id: customer.id,
      salesperson_id: owner, total_amount: total, status: 'pending' });
    return Invoice.create({ invoice_number: `PRIVATE-${name}`, order_id: order.id, subtotal: total, tax_amount: 0, total_amount: total });
  }
  own = await make('OWN', users.a.id, 100);
  cancelled = await make('CANCELLED', users.a.id, 200);
  other = await make('OTHER', users.b.id, 300);
  unassigned = await make('UNASSIGNED', null, 400);
  await SalesCreditNote.create({ credit_number: 'ACCESS-CREDIT', invoice_id: cancelled.id,
    order_id: cancelled.order_id, customer_id: customer.id, subtotal: 200, tax_amount: 0,
    total_amount: 200, confirmed_not_dispatched: true, created_by: users.admin.id });
  await TreasuryTransaction.create({ type: 'receipt', amount: 40, method: 'cash', invoice_id: own.id, customer_id: customer.id, created_by: users.admin.id });
});
afterAll(() => sequelize.close());
const get = (path, key) => request(app).get(path).set('Authorization', `Bearer ${tokens[key]}`);

test.each(['warehouse', 'distributor'])('%s cannot read invoices, summaries or IDs', async role => {
  for (const path of ['/api/invoices', '/api/invoices?include_summary=true', `/api/invoices/${other.id}`, '/api/invoices/999999']) {
    const res = await get(path, role);
    expect(res.status).toBe(403);
    expect(Object.keys(res.body)).toEqual(['message']);
    expect(JSON.stringify(res.body)).not.toContain('PRIVATE-');
    expect(JSON.stringify(res.body)).not.toContain('Shared customer');
  }
});
test('admin reads all invoices and global financial summary', async () => {
  const list = await get('/api/invoices', 'admin');
  expect(list.status).toBe(200);
  expect(list.body.map(i => i.id).sort()).toEqual([own.id, cancelled.id, other.id, unassigned.id].sort());
  const summary = await get('/api/invoices?include_summary=true', 'admin');
  expect(summary.body.summary).toMatchObject({ count: 4, original_total: 1000, credited_total: 200, outstanding_amount: 760 });
  expect((await get(`/api/invoices/${other.id}`, 'admin')).status).toBe(200);
});
test('salesperson list and summary only contain explicitly owned orders', async () => {
  const list = await get('/api/invoices', 'a');
  expect(list.body.map(i => i.id).sort()).toEqual([own.id, cancelled.id].sort());
  const summary = await get('/api/invoices?include_summary=true', 'a');
  expect(summary.status).toBe(200);
  expect(summary.body.summary).toMatchObject({ count: 2, original_total: 300, credited_total: 200, received_amount: 40, outstanding_amount: 60 });
  const otherSalesperson = await get('/api/invoices?include_summary=true', 'b');
  expect(otherSalesperson.body.data.map(i => i.id)).toEqual([other.id]);
});
test('query parameters cannot broaden salesperson scope or shared-customer access', async () => {
  const res = await get(`/api/invoices?include_summary=true&salesperson_id=${users.b.id}&customer_id=${customer.id}&search=Shared`, 'a');
  expect(res.status).toBe(200);
  expect(res.body.data.map(i => i.id).sort()).toEqual([own.id, cancelled.id].sort());
  const hiddenSearch = await get('/api/invoices?include_summary=true&search=PRIVATE-OTHER', 'a');
  expect(hiddenSearch.body.data).toEqual([]);
  expect(hiddenSearch.body.summary.count).toBe(0);
  const filtered = await get('/api/invoices?include_summary=true&document_status=cancelled', 'a');
  expect(filtered.body.data.map(i => i.id)).toEqual([cancelled.id]);
});
test('owned detail is readable; other, unassigned and missing IDs are indistinguishable', async () => {
  expect((await get(`/api/invoices/${own.id}`, 'a')).status).toBe(200);
  let expected;
  for (const id of [other.id, unassigned.id, 999999, 0, 2147483648, 'invalid']) {
    const res = await get(`/api/invoices/${id}?include_summary=true`, 'a');
    expect(res.status).toBe(404);
    expect(Object.keys(res.body)).toEqual(['message']);
    if (!expected) expected = res.body;
    expect(res.body).toEqual(expected);
  }
});
test('unauthenticated requests receive no financial data', async () => {
  const res = await request(app).get('/api/invoices?include_summary=true');
  expect(res.status).toBe(401);
  expect(Object.keys(res.body)).toEqual(['message']);
});

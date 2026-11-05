process.env.JWT_SECRET = 'test_secret';

// Optional PostgreSQL run: only a database ending in _test is accepted. Every
// run owns a fresh schema; no application tables or migrations are touched.
jest.mock('../src/config/database', () => {
  if (process.env.NODE_ENV !== 'test') throw new Error('NODE_ENV=test is required');
  const { Sequelize } = require('sequelize');
  const url = process.env.ORDER_CYCLE_TEST_DATABASE_URL;
  if (!url) return new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false,
    define: { underscored: true, timestamps: true } });
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) {
    throw new Error('PostgreSQL database name must end in _test');
  }
  const schema = `order_cycle_${require('crypto').randomBytes(8).toString('hex')}`;
  return new Sequelize(url, { logging: false, pool: { max: 5, min: 0 },
    define: { underscored: true, timestamps: true, schema } });
});

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Order, OrderItem, Product, Customer, Distributor } = require('../src/models');
const service = require('../src/services/orderService');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
let token, customer, distributor, product, sequence = 0;
const postgres = Boolean(process.env.ORDER_CYCLE_TEST_DATABASE_URL);

beforeAll(async () => {
  if (postgres) await sequelize.createSchema(sequelize.options.define.schema);
  await sequelize.sync({ force: true });
  await seedRoles();
  token = tokenFor(await createUser({ email: 'order-cycle@example.test' }));
  customer = await Customer.create({ full_name: 'Cycle customer', phone: '09120000000' });
  distributor = await Distributor.create({ full_name: 'Cycle distributor', phone: '09121111111' });
});
beforeEach(async () => {
  product = await Product.create({ sku: `CYCLE-${++sequence}`, name: 'Cycle product',
    unit_price: 100, stock_quantity: 20 });
});
afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
  if (postgres) await sequelize.dropSchema(sequelize.options.define.schema, { cascade: true });
  await sequelize.close();
});

async function create(quote = false) {
  const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
    .send({ customer_id: customer.id, is_quote: quote,
      items: [{ product_id: product.id, quantity: 3 }] });
  expect(res.status).toBe(201);
  return res.body;
}
function status(id, value) {
  return request(app).patch(`/api/orders/${id}/status`)
    .set('Authorization', `Bearer ${token}`).send({ status: value });
}
function assign(id) {
  return request(app).patch(`/api/orders/${id}/assign-distributor`)
    .set('Authorization', `Bearer ${token}`).send({ distributor_id: distributor.id });
}
async function stock() { return (await product.reload()).stock_quantity; }

test.each(['cancelled', 'delivered', 'quote'])('assignment rejects %s without changes', async (state) => {
  const order = await create(state === 'quote');
  if (state === 'cancelled') expect((await status(order.id, state)).status).toBe(200);
  if (state === 'delivered') {
    for (const next of ['confirmed', 'processing', 'out_for_delivery', 'delivered']) {
      expect((await status(order.id, next)).status).toBe(200);
    }
  }
  const before = await stock();
  expect((await assign(order.id)).status).toBe(400);
  const saved = await Order.findByPk(order.id);
  expect(saved.status).toBe(state);
  expect(saved.distributor_id).toBeNull();
  expect(await stock()).toBe(before);
});

test('assignment preserves status; normal dispatch and delivery still work', async () => {
  const order = await create();
  expect(await stock()).toBe(17);
  const assigned = await assign(order.id);
  expect(assigned.status).toBe(200);
  expect(assigned.body.status).toBe('pending');
  expect(assigned.body.distributor_id).toBe(distributor.id);
  expect((await status(order.id, 'out_for_delivery')).status).toBe(400);
  for (const next of ['confirmed', 'processing', 'out_for_delivery', 'delivered']) {
    expect((await status(order.id, next)).status).toBe(200);
  }
  expect(await stock()).toBe(17);
});

test('cancel restores stock once, marks compensation and cannot be reopened', async () => {
  const order = await create();
  expect((await status(order.id, 'cancelled')).status).toBe(200);
  expect((await Order.findByPk(order.id)).stock_compensated).toBe(true);
  expect(await stock()).toBe(20);
  expect((await status(order.id, 'cancelled')).status).toBe(400);
  expect((await assign(order.id)).status).toBe(400);
  expect(await stock()).toBe(20);
});

test('an existing compensation flag prevents another restoration', async () => {
  const order = await create();
  await Order.update({ stock_compensated: true }, { where: { id: order.id } });
  expect((await status(order.id, 'cancelled')).status).toBe(200);
  expect(await stock()).toBe(17);
});

test('quote cancellation is rejected and never affects stock', async () => {
  const order = await create(true);
  expect((await status(order.id, 'cancelled')).status).toBe(400);
  expect(await stock()).toBe(20);
});

test('failure after stock restoration rolls back stock, status and flag together', async () => {
  const order = await create();
  jest.spyOn(Order.prototype, 'update').mockRejectedValueOnce(new Error('injected failure'));
  expect((await status(order.id, 'cancelled')).status).toBe(500);
  const saved = await Order.findByPk(order.id);
  expect(saved.status).toBe('pending');
  expect(saved.stock_compensated).toBe(false);
  expect(await stock()).toBe(17);
});

test('failure on a later product rolls back earlier product restoration', async () => {
  const order = await create();
  const second = await Product.create({ sku: `SECOND-${sequence}`, name: 'Second', unit_price: 1, stock_quantity: 5 });
  await OrderItem.create({ order_id: order.id, product_id: second.id, quantity: 2, unit_price: 1, line_total: 2 });
  const original = Product.prototype.update;
  jest.spyOn(Product.prototype, 'update').mockImplementation(function (...args) {
    if (this.id === second.id) throw new Error('injected second-product failure');
    return original.apply(this, args);
  });
  await expect(service.updateOrderStatus(order.id, 'cancelled')).rejects.toThrow();
  expect(await stock()).toBe(17);
  expect((await second.reload()).stock_quantity).toBe(5);
  expect((await Order.findByPk(order.id)).status).toBe('pending');
});

// SQLite cannot prove row-lock behaviour. These run only on isolated PostgreSQL.
(postgres ? describe : describe.skip)('PostgreSQL concurrent order operations', () => {
  test('two cancellations restore stock only once', async () => {
    const order = await create();
    const results = await Promise.all([status(order.id, 'cancelled'), status(order.id, 'cancelled')]);
    expect(results.map(r => r.status).sort()).toEqual([200, 400]);
    expect(await stock()).toBe(20);
    expect((await Order.findByPk(order.id)).stock_compensated).toBe(true);
  });
  test('assignment racing with cancellation cannot reactivate an order', async () => {
    const order = await create();
    const [cancel, assignment] = await Promise.all([status(order.id, 'cancelled'), assign(order.id)]);
    expect(cancel.status).toBe(200);
    expect([200, 400]).toContain(assignment.status);
    expect((await Order.findByPk(order.id)).status).toBe('cancelled');
    expect(await stock()).toBe(20);
  });
});

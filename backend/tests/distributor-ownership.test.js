process.env.JWT_SECRET = 'test_secret';

/**
 * Distributor ownership enforcement tests.
 *
 * Verifies that a distributor user:
 *   - can view and update status of orders assigned to them
 *   - cannot view or update status of orders assigned to another distributor
 *   - cannot view or update status of unassigned orders
 *   - sees only their own orders in the list endpoint
 *
 * Admin users have unrestricted access to all orders throughout.
 */

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer, Order, Distributor } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let distAToken;   // distributor user linked to distributorA
let distBToken;   // distributor user linked to distributorB
let distributorA;
let distributorB;
let product;
let customer;
let orderForA;    // assigned to distributorA
let orderForB;    // assigned to distributorB
let unassignedOrder;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();

  const admin = await createUser({ roleName: 'admin', email: 'admin-own-test@example.test' });
  adminToken = tokenFor(admin);

  const userA = await createUser({ roleName: 'distributor', email: 'dist-a-own@example.test' });
  distAToken  = tokenFor(userA);

  const userB = await createUser({ roleName: 'distributor', email: 'dist-b-own@example.test' });
  distBToken  = tokenFor(userB);

  distributorA = await Distributor.create({ full_name: 'توزیع‌کننده آ', phone: '09120000101', user_id: userA.id });
  distributorB = await Distributor.create({ full_name: 'توزیع‌کننده ب', phone: '09120000102', user_id: userB.id });

  product  = await Product.create({ sku: 'OWN-100', name: 'کالای ownership', unit_price: 10000, stock_quantity: 200, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'مشتری ownership', phone: '09120000103' });

  // helper: create a plain order directly in DB (bypass stock deduction for speed)
  async function mkOrder(distributorId) {
    return Order.create({
      order_number:   `ORD-OWN-${Math.random().toString(36).slice(2, 8)}`,
      customer_id:    customer.id,
      distributor_id: distributorId || null,
      total_amount:   10000,
      status:         distributorId ? 'out_for_delivery' : 'pending',
      is_quote:       false,
    });
  }

  orderForA      = await mkOrder(distributorA.id);
  orderForB      = await mkOrder(distributorB.id);
  unassignedOrder = await mkOrder(null);
});

afterAll(async () => {
  await sequelize.close();
});

// ─────────────────────────────────────────────────────────────
describe('GET /api/orders (list) — محدودیت دید توزیع‌کننده', () => {
  test('توزیع‌کننده آ فقط سفارش خودش را می‌بیند', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${distAToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((o) => o.id);
    expect(ids).toContain(orderForA.id);
    expect(ids).not.toContain(orderForB.id);
    expect(ids).not.toContain(unassignedOrder.id);
  });

  test('توزیع‌کننده ب فقط سفارش خودش را می‌بیند', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${distBToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((o) => o.id);
    expect(ids).toContain(orderForB.id);
    expect(ids).not.toContain(orderForA.id);
    expect(ids).not.toContain(unassignedOrder.id);
  });

  test('ادمین همه سفارش‌ها را می‌بیند', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((o) => o.id);
    expect(ids).toContain(orderForA.id);
    expect(ids).toContain(orderForB.id);
    expect(ids).toContain(unassignedOrder.id);
  });
});

// ─────────────────────────────────────────────────────────────
describe('GET /api/orders/:id — کنترل دسترسی توزیع‌کننده', () => {
  test('توزیع‌کننده آ می‌تواند سفارش خودش را ببیند', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderForA.id}`)
      .set('Authorization', `Bearer ${distAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderForA.id);
  });

  test('توزیع‌کننده آ نمی‌تواند سفارش توزیع‌کننده ب را ببیند', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderForB.id}`)
      .set('Authorization', `Bearer ${distAToken}`);
    expect(res.status).toBe(403);
  });

  test('توزیع‌کننده آ نمی‌تواند سفارش بدون توزیع‌کننده را ببیند', async () => {
    const res = await request(app)
      .get(`/api/orders/${unassignedOrder.id}`)
      .set('Authorization', `Bearer ${distAToken}`);
    expect(res.status).toBe(403);
  });

  test('ادمین می‌تواند هر سفارشی را ببیند', async () => {
    for (const id of [orderForA.id, orderForB.id, unassignedOrder.id]) {
      const res = await request(app)
        .get(`/api/orders/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    }
  });
});

// ─────────────────────────────────────────────────────────────
describe('PATCH /api/orders/:id/status — کنترل دسترسی توزیع‌کننده', () => {
  test('توزیع‌کننده آ می‌تواند وضعیت سفارش خودش را تغییر دهد', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderForA.id}/status`)
      .set('Authorization', `Bearer ${distAToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');
  });

  test('توزیع‌کننده آ نمی‌تواند وضعیت سفارش توزیع‌کننده ب را تغییر دهد', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderForB.id}/status`)
      .set('Authorization', `Bearer ${distAToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(403);
  });

  test('توزیع‌کننده آ نمی‌تواند وضعیت سفارش بدون توزیع‌کننده را تغییر دهد', async () => {
    const res = await request(app)
      .patch(`/api/orders/${unassignedOrder.id}/status`)
      .set('Authorization', `Bearer ${distAToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(403);
  });

  test('ادمین می‌تواند وضعیت هر سفارشی را تغییر دهد', async () => {
    const res = await request(app)
      .patch(`/api/orders/${unassignedOrder.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });
});

// ─────────────────────────────────────────────────────────────
describe('توزیع‌کننده بدون رکورد Distributor', () => {
  test('توزیع‌کننده بدون رکورد مرتبط هیچ سفارشی نمی‌بیند', async () => {
    const orphanUser = await createUser({ roleName: 'distributor', email: 'dist-orphan@example.test' });
    const orphanToken = tokenFor(orphanUser);
    // هیچ رکورد Distributor به این user_id وصل نیست

    const listRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${orphanToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(0);

    const detailRes = await request(app)
      .get(`/api/orders/${orderForA.id}`)
      .set('Authorization', `Bearer ${orphanToken}`);
    expect(detailRes.status).toBe(403);
  });
});

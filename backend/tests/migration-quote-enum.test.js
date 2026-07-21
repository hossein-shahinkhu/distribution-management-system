process.env.JWT_SECRET = 'test_secret';

/**
 * Tests for migration M-24: add `quote` to orders status enum.
 *
 * SQLite (used in all automated tests) does not enforce real ENUM constraints —
 * it stores any string value.  These tests therefore verify the application-level
 * behaviour that depends on the `quote` status being valid:
 *
 *   1. An order can be created with status='quote' (is_quote=true).
 *   2. The quote appears in list results with status='quote'.
 *   3. The quote is excluded from the state-machine updateStatus handler.
 *   4. The quote can be converted to a real order via convert-to-order.
 *
 * Actual PostgreSQL ENUM mutation (ALTER TYPE ... ADD VALUE) must be verified
 * by running `npm run migrate` against a real PostgreSQL instance and inspecting
 * `npm run migrate:status`.  The idempotency of M-24 can be confirmed by running
 * `npm run migrate` twice without error.
 */

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let product;
let customer;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();

  const admin = await createUser({ roleName: 'admin', email: 'admin-enum-test@example.test' });
  adminToken = tokenFor(admin);

  product  = await Product.create({ sku: 'EN-100', name: 'کالای تست enum', unit_price: 50000, stock_quantity: 50, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'مشتری تست enum', phone: '09120000042' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('M-24: مقدار quote در ENUM وضعیت سفارش', () => {
  test('سفارش با is_quote=true با وضعیت quote ثبت می‌شود', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1 }], is_quote: true });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('quote');
    expect(res.body.is_quote).toBe(true);
  });

  test('سفارش quote در لیست سفارش‌ها با فیلتر status=quote ظاهر می‌شود', async () => {
    // ایجاد یک پیش‌فاکتور جدید برای این تست
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1 }], is_quote: true });
    expect(createRes.status).toBe(201);
    const quoteId = createRes.body.id;

    const listRes = await request(app)
      .get('/api/orders?status=quote')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.map((o) => o.id);
    expect(ids).toContain(quoteId);
    expect(listRes.body.data.every((o) => o.status === 'quote')).toBe(true);
  });

  test('تغییر وضعیت مستقیم پیش‌فاکتور از updateStatus رد می‌شود', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1 }], is_quote: true });
    expect(createRes.status).toBe(201);

    const res = await request(app)
      .patch(`/api/orders/${createRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending' });

    expect(res.status).toBe(400);
  });

  test('تبدیل پیش‌فاکتور به سفارش قطعی وضعیت را از quote به pending تغییر می‌دهد', async () => {
    const stockBefore = (await Product.findByPk(product.id)).stock_quantity;

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 2 }], is_quote: true });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('quote');
    // موجودی هنگام ثبت پیش‌فاکتور کسر نمی‌شود
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(stockBefore);

    const convertRes = await request(app)
      .post(`/api/orders/${createRes.body.id}/convert-to-order`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(convertRes.status).toBe(200);
    expect(convertRes.body.status).toBe('pending');
    expect(convertRes.body.is_quote).toBe(false);
    // موجودی پس از تبدیل کسر می‌شود
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(stockBefore - 2);
  });
});

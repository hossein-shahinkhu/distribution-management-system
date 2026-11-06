process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer, Order, OrderItem } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let warehouseToken;
let distributorToken;
let product;
let customer;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();

  const admin = await createUser({ roleName: 'admin', email: 'admin-sm-test@example.test' });
  adminToken = tokenFor(admin);

  const warehouse = await createUser({ roleName: 'warehouse_keeper', email: 'wh-sm-test@example.test' });
  warehouseToken = tokenFor(warehouse);

  const dist = await createUser({ roleName: 'distributor', email: 'dist-sm-test@example.test' });
  distributorToken = tokenFor(dist);

  product  = await Product.create({ sku: 'SM-100', name: 'کالای ماشین وضعیت', unit_price: 10000, stock_quantity: 100, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'مشتری ماشین وضعیت', phone: '09120000001' });
});

afterAll(async () => {
  await sequelize.close();
});

/** Helper: create a normal (non-quote) order */
async function createOrder(quantity = 2) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity }] });
  expect(res.status).toBe(201);
  return res.body;
}

/** Helper: advance order through the full valid chain */
async function advanceToStatus(orderId, targetStatus) {
  const chain = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered'];
  const idx = chain.indexOf(targetStatus);
  for (let i = 0; i < idx; i++) {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: chain[i + 1] });
    expect(res.status).toBe(200);
  }
}

// ─────────────────────────────────────────────────────────────
describe('ماشین وضعیت — گذارهای مجاز', () => {
  test('pending → confirmed', async () => {
    const order = await createOrder();
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  test('confirmed → processing', async () => {
    const order = await createOrder();
    await advanceToStatus(order.id, 'confirmed');
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processing');
  });

  test('processing → out_for_delivery', async () => {
    const order = await createOrder();
    await advanceToStatus(order.id, 'processing');
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'out_for_delivery' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('out_for_delivery');
  });

  test('out_for_delivery → delivered تاریخ تحویل را تنظیم می‌کند', async () => {
    const order = await createOrder();
    await advanceToStatus(order.id, 'out_for_delivery');
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');
    expect(res.body.delivery_date).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
describe('ماشین وضعیت — گذارهای غیرمجاز', () => {
  test('pending → delivered مجاز نیست', async () => {
    const order = await createOrder();
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(400);
  });

  test('pending → processing مجاز نیست', async () => {
    const order = await createOrder();
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });
    expect(res.status).toBe(400);
  });

  test('delivered → cancelled مجاز نیست (وضعیت پایانی)', async () => {
    const order = await createOrder();
    await advanceToStatus(order.id, 'delivered');
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    expect(res.status).toBe(400);
  });

  test('cancelled → pending مجاز نیست (وضعیت پایانی)', async () => {
    const order = await createOrder();
    await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending' });
    expect(res.status).toBe(400);
  });

  test('تغییر وضعیت پیش‌فاکتور از مسیر updateStatus مجاز نیست', async () => {
    const quoteRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1 }], is_quote: true });
    expect(quoteRes.status).toBe(201);

    const res = await request(app)
      .patch(`/api/orders/${quoteRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending' });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
describe('جبران موجودی هنگام لغو سفارش', () => {
  test('لغو از pending موجودی انبار را بازمی‌گرداند', async () => {
    const qty = 5;
    const before = (await Product.findByPk(product.id)).stock_quantity;
    const order = await createOrder(qty);
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(before - qty);

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    expect(res.status).toBe(200);
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(before);
  });

  test('لغو از confirmed موجودی انبار را بازمی‌گرداند', async () => {
    const qty = 3;
    const before = (await Product.findByPk(product.id)).stock_quantity;
    const order = await createOrder(qty);
    await advanceToStatus(order.id, 'confirmed');

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    expect(res.status).toBe(200);
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(before);
  });

  test('لغو از processing موجودی انبار را بازمی‌گرداند', async () => {
    const qty = 2;
    const before = (await Product.findByPk(product.id)).stock_quantity;
    const order = await createOrder(qty);
    await advanceToStatus(order.id, 'processing');

    await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(before);
  });

  test('لغو از out_for_delivery رد می‌شود و موجودی تغییر نمی‌کند', async () => {
    const qty = 4;
    const before = (await Product.findByPk(product.id)).stock_quantity;
    const order = await createOrder(qty);
    await advanceToStatus(order.id, 'out_for_delivery');

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    expect(res.status).toBe(400);
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(before - qty);
  });

  test('لغو سفارش تحویل‌شده غیرمجاز است و موجودی تغییر نمی‌کند', async () => {
    const qty = 1;
    const order = await createOrder(qty);
    await advanceToStatus(order.id, 'delivered');
    const stockAfterDelivery = (await Product.findByPk(product.id)).stock_quantity;

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    expect(res.status).toBe(400);
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(stockAfterDelivery);
  });

  test('تلاش مجدد برای لغو یک سفارش قبلاً لغوشده موجودی را دوباره بازنمی‌گرداند', async () => {
    const qty = 2;
    const order = await createOrder(qty);

    await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    const stockAfterCancel = (await Product.findByPk(product.id)).stock_quantity;

    // second cancel attempt should be rejected by state machine (cancelled is terminal)
    const res2 = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });
    expect(res2.status).toBe(400);
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(stockAfterCancel);
  });
});

process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Supplier } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let product;
let supplier;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-po-sm-test@example.test' });
  adminToken = tokenFor(admin);

  product  = await Product.create({ sku: 'PO-SM-100', name: 'کالای ماشین وضعیت خرید', unit_price: 20000, stock_quantity: 50, reorder_level: 5 });
  supplier = await Supplier.create({ name: 'تامین‌کننده ماشین وضعیت', phone: '09121110000' });
});

afterAll(async () => {
  await sequelize.close();
});

/** Helper: create a purchase order in draft status */
async function createPO(quantity = 5) {
  const res = await request(app)
    .post('/api/purchase-orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ supplier_id: supplier.id, items: [{ product_id: product.id, quantity, unit_cost: 15000 }] });
  expect(res.status).toBe(201);
  return res.body;
}

/** Helper: patch status */
async function patchStatus(id, status) {
  return request(app)
    .patch(`/api/purchase-orders/${id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status });
}

// ─────────────────────────────────────────────────────────────
describe('ماشین وضعیت سفارش خرید — گذارهای مجاز', () => {
  test('draft → ordered', async () => {
    const po = await createPO();
    const res = await patchStatus(po.id, 'ordered');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ordered');
  });

  test('ordered → received موجودی را افزایش می‌دهد', async () => {
    const qty = 8;
    const before = (await Product.findByPk(product.id)).stock_quantity;
    const po = await createPO(qty);
    await patchStatus(po.id, 'ordered');

    const res = await patchStatus(po.id, 'received');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('received');
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(before + qty);
  });

  test('draft → cancelled', async () => {
    const po = await createPO();
    const res = await patchStatus(po.id, 'cancelled');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  test('ordered → cancelled', async () => {
    const po = await createPO();
    await patchStatus(po.id, 'ordered');
    const res = await patchStatus(po.id, 'cancelled');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });
});

// ─────────────────────────────────────────────────────────────
describe('ماشین وضعیت سفارش خرید — گذارهای غیرمجاز', () => {
  test('draft → received مجاز نیست (باید ابتدا به ordered برود)', async () => {
    const po = await createPO();
    const res = await patchStatus(po.id, 'received');
    expect(res.status).toBe(400);
  });

  test('received → cancelled مجاز نیست (وضعیت پایانی)', async () => {
    const po = await createPO();
    await patchStatus(po.id, 'ordered');
    await patchStatus(po.id, 'received');

    const res = await patchStatus(po.id, 'cancelled');
    expect(res.status).toBe(400);
  });

  test('received → ordered مجاز نیست', async () => {
    const po = await createPO();
    await patchStatus(po.id, 'ordered');
    await patchStatus(po.id, 'received');

    const res = await patchStatus(po.id, 'ordered');
    expect(res.status).toBe(400);
  });

  test('cancelled → ordered مجاز نیست (وضعیت پایانی)', async () => {
    const po = await createPO();
    await patchStatus(po.id, 'cancelled');

    const res = await patchStatus(po.id, 'ordered');
    expect(res.status).toBe(400);
  });

  test('علامت‌گذاری مجدد received→received موجودی را دوباره افزایش نمی‌دهد', async () => {
    const qty = 3;
    const po = await createPO(qty);
    await patchStatus(po.id, 'ordered');
    await patchStatus(po.id, 'received');
    const stockAfterReceive = (await Product.findByPk(product.id)).stock_quantity;

    // received is terminal — transition is rejected
    const res = await patchStatus(po.id, 'received');
    expect(res.status).toBe(400);
    expect((await Product.findByPk(product.id)).stock_quantity).toBe(stockAfterReceive);
  });
});

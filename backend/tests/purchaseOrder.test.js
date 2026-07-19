process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Supplier } = require('../src/models');
const { seedRoles, createUser } = require('./testUtils');
const { generateToken } = require('../src/utils/token');

let adminToken;
let salespersonToken;
let product;
let supplier;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-po-test@example.test' });
  adminToken = generateToken(admin);
  const salesperson = await createUser({ roleName: 'salesperson', email: 'salesperson-po-test@example.test' });
  salespersonToken = generateToken(salesperson);

  product = await Product.create({ sku: 'PU-100', name: 'کالای خرید', unit_price: 50000, stock_quantity: 20, reorder_level: 5 });
  supplier = await Supplier.create({ name: 'تامین‌کننده تست', phone: '09121230000' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('دسترسی به سفارش‌های خرید', () => {
  test('فروشنده اجازه ثبت سفارش خرید ندارد', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${salespersonToken}`)
      .send({ supplier_id: supplier.id, items: [{ product_id: product.id, quantity: 5, unit_cost: 40000 }] });
    expect(res.status).toBe(403);
  });
});

describe('ثبت سفارش خرید', () => {
  test('ثبت سفارش خرید جدید بدون تغییر موجودی انبار', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ supplier_id: supplier.id, items: [{ product_id: product.id, quantity: 10, unit_cost: 40000 }] });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(Number(res.body.total_amount)).toBe(400000);

    const unchangedProduct = await Product.findByPk(product.id);
    expect(unchangedProduct.stock_quantity).toBe(20);
  });

  test('رد سفارش خرید بدون تامین‌کننده یا اقلام', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ supplier_id: supplier.id, items: [] });
    expect(res.status).toBe(400);
  });
});

describe('تغییر وضعیت سفارش خرید به دریافت‌شده', () => {
  test('تغییر وضعیت به received موجودی انبار را افزایش می‌دهد', async () => {
    const poRes = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ supplier_id: supplier.id, items: [{ product_id: product.id, quantity: 7, unit_cost: 40000 }] });

    const statusRes = await request(app)
      .patch(`/api/purchase-orders/${poRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'received' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('received');

    const updatedProduct = await Product.findByPk(product.id);
    expect(updatedProduct.stock_quantity).toBe(27); // 20 + 7
  });

  test('علامت‌گذاری مجدد یک سفارش خرید که قبلاً دریافت شده، موجودی را دوباره افزایش نمی‌دهد', async () => {
    const poRes = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ supplier_id: supplier.id, items: [{ product_id: product.id, quantity: 3, unit_cost: 40000 }] });

    await request(app)
      .patch(`/api/purchase-orders/${poRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'received' });

    const productAfterFirstReceive = await Product.findByPk(product.id);
    const stockAfterFirstReceive = productAfterFirstReceive.stock_quantity;

    // تلاش دوباره برای علامت‌گذاری به‌عنوان دریافت‌شده (وضعیت از قبل received است)
    await request(app)
      .patch(`/api/purchase-orders/${poRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'received' });

    const productAfterSecondAttempt = await Product.findByPk(product.id);
    expect(productAfterSecondAttempt.stock_quantity).toBe(stockAfterFirstReceive);
  });
});

describe('لیست و فیلتر سفارش‌های خرید', () => {
  test('فیلتر بر اساس وضعیت کار می‌کند', async () => {
    const res = await request(app)
      .get('/api/purchase-orders?status=received')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((po) => po.status === 'received')).toBe(true);
  });
});

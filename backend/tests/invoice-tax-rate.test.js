process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let salespersonToken;
let product;
let customer;

// Helper: create an order and return its id
async function createOrder(token) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 2 }] });
  return res.body.id;
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();

  const admin = await createUser({ roleName: 'admin', email: 'admin-invoice-tax@example.test' });
  adminToken = tokenFor(admin);

  const salesperson = await createUser({ roleName: 'salesperson', email: 'salesperson-invoice-tax@example.test' });
  salespersonToken = tokenFor(salesperson);

  product = await Product.create({
    sku: 'TAX-001', name: 'کالای مالیات', unit_price: 100000,
    stock_quantity: 100, reorder_level: 5,
  });
  customer = await Customer.create({ full_name: 'مشتری مالیات', phone: '09120000001' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('مالیات قابل‌تنظیم روی فاکتور', () => {
  test('ثبت فاکتور بدون tax_rate — پیش‌فرض ۹٪ اعمال می‌شود (سازگاری با گذشته)', async () => {
    const orderId = await createOrder(adminToken);
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ order_id: orderId });

    expect(res.status).toBe(201);
    // subtotal = 2 * 100000 = 200000; tax = 9% = 18000; total = 218000
    expect(Number(res.body.tax_rate)).toBe(9);
    expect(Number(res.body.tax_amount)).toBe(18000);
    expect(Number(res.body.total_amount)).toBe(218000);
  });

  test('ثبت فاکتور با tax_rate سفارشی (۵٪)', async () => {
    const orderId = await createOrder(adminToken);
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ order_id: orderId, tax_rate: 5 });

    expect(res.status).toBe(201);
    // subtotal = 200000; tax = 5% = 10000; total = 210000
    expect(Number(res.body.tax_rate)).toBe(5);
    expect(Number(res.body.tax_amount)).toBe(10000);
    expect(Number(res.body.total_amount)).toBe(210000);
  });

  test('ثبت فاکتور با tax_rate صفر — بدون مالیات', async () => {
    const orderId = await createOrder(adminToken);
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ order_id: orderId, tax_rate: 0 });

    expect(res.status).toBe(201);
    expect(Number(res.body.tax_rate)).toBe(0);
    expect(Number(res.body.tax_amount)).toBe(0);
    expect(Number(res.body.total_amount)).toBe(200000);
  });

  test('رد درخواست با tax_rate خارج از بازه (بیشتر از ۱۰۰)', async () => {
    const orderId = await createOrder(adminToken);
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ order_id: orderId, tax_rate: 150 });

    expect(res.status).toBe(400);
  });

  test('رد درخواست با tax_rate منفی', async () => {
    const orderId = await createOrder(adminToken);
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ order_id: orderId, tax_rate: -1 });

    expect(res.status).toBe(400);
  });

  test('فروشنده می‌تواند فاکتور با tax_rate سفارشی ثبت کند', async () => {
    const orderId = await createOrder(salespersonToken);
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${salespersonToken}`)
      .send({ order_id: orderId, tax_rate: 7 });

    expect(res.status).toBe(201);
    expect(Number(res.body.tax_rate)).toBe(7);
  });
});

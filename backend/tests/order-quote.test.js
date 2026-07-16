process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer } = require('../src/models');
const { seedRoles, createUser } = require('./testUtils');
const { generateToken } = require('../src/utils/token');

let adminToken;
let product;
let customer;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-quote-test@example.test' });
  adminToken = generateToken(admin);

  product = await Product.create({ sku: 'Q-100', name: 'کالای پیش‌فاکتور', unit_price: 50000, stock_quantity: 10, reorder_level: 2 });
  customer = await Customer.create({ full_name: 'مشتری پیش‌فاکتور', phone: '09121112233' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('پیش‌فاکتور', () => {
  test('ثبت پیش‌فاکتور موجودی انبار را کسر نمی‌کند', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 3 }], is_quote: true });

    expect(res.status).toBe(201);
    expect(res.body.is_quote).toBe(true);
    expect(res.body.status).toBe('quote');

    const unchangedProduct = await Product.findByPk(product.id);
    expect(unchangedProduct.stock_quantity).toBe(10);
  });

  test('پیش‌فاکتور حتی با موجودی ناکافی هم ثبت می‌شود', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1000 }], is_quote: true });

    expect(res.status).toBe(201);
    expect(res.body.is_quote).toBe(true);
  });

  test('تبدیل پیش‌فاکتور به سفارش قطعی، موجودی را کسر و وضعیت را تغییر می‌دهد', async () => {
    const quoteRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 4 }], is_quote: true });

    const convertRes = await request(app)
      .post(`/api/orders/${quoteRes.body.id}/convert-to-order`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(convertRes.status).toBe(200);
    expect(convertRes.body.is_quote).toBe(false);
    expect(convertRes.body.status).toBe('pending');

    const updatedProduct = await Product.findByPk(product.id);
    expect(updatedProduct.stock_quantity).toBe(6); // 10 - 4
  });

  test('تبدیل پیش‌فاکتور با موجودی ناکافی رد می‌شود و موجودی تغییر نمی‌کند', async () => {
    const quoteRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1000 }], is_quote: true });

    const convertRes = await request(app)
      .post(`/api/orders/${quoteRes.body.id}/convert-to-order`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(convertRes.status).toBe(400);

    const unchangedProduct = await Product.findByPk(product.id);
    expect(unchangedProduct.stock_quantity).toBe(6);
  });

  test('تبدیل یک سفارش عادی (غیر پیش‌فاکتور) رد می‌شود', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1 }] });

    const convertRes = await request(app)
      .post(`/api/orders/${orderRes.body.id}/convert-to-order`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(convertRes.status).toBe(400);
  });
});

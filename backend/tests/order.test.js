process.env.JWT_SECRET = 'test_secret';

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
  const admin = await createUser({ roleName: 'admin', email: 'admin-order-test@example.test' });
  adminToken = tokenFor(admin);

  product = await Product.create({ sku: 'P-100', name: 'ماست ۲ کیلویی', unit_price: 85000, stock_quantity: 20, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'فروشگاه تست', phone: '09120000000' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('ثبت سفارش', () => {
  test('ثبت سفارش معتبر و کسر خودکار موجودی انبار', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 5 }] });

    expect(res.status).toBe(201);
    expect(Number(res.body.total_amount)).toBe(5 * 85000);

    const updatedProduct = await Product.findByPk(product.id);
    expect(updatedProduct.stock_quantity).toBe(15); // 20 - 5
  });

  test('رد سفارش در صورت ناکافی بودن موجودی', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 1000 }] });

    expect(res.status).toBe(400);

    // موجودی نباید تغییر کرده باشد (تراکنش باید rollback شده باشد)
    const unchangedProduct = await Product.findByPk(product.id);
    expect(unchangedProduct.stock_quantity).toBe(15);
  });

  test('تغییر وضعیت سفارش به تحویل‌شده', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 2 }] });

    const statusRes = await request(app)
      .patch(`/api/orders/${orderRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('delivered');
    expect(statusRes.body.delivery_date).toBeTruthy();
  });
});

process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer, Order } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let product;
let customer;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-filter-test@example.test' });
  adminToken = tokenFor(admin);

  product  = await Product.create({ sku: 'FLT-100', name: 'کالای فیلتر', unit_price: 100000, stock_quantity: 999, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'مشتری فیلتر', phone: '09120000200' });

  // ایجاد سفارش‌هایی با تاریخ و مبلغ متفاوت
  const mkOrder = (amount, date) => Order.create({
    order_number:  `ORD-FLT-${Math.random().toString(36).slice(2, 8)}`,
    customer_id:   customer.id,
    total_amount:  amount,
    status:        'pending',
    is_quote:      false,
    order_date:    date,
  });

  await mkOrder(500000,  new Date('2025-01-10'));
  await mkOrder(1500000, new Date('2025-03-15'));
  await mkOrder(3000000, new Date('2025-06-20'));
  await mkOrder(200000,  new Date('2025-09-05'));
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/orders — فیلتر تاریخ', () => {
  test('date_from سفارش‌های قبل از آن تاریخ را حذف می‌کند', async () => {
    const res = await request(app)
      .get('/api/orders?date_from=2025-03-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((o) => {
      expect(new Date(o.order_date).getTime()).toBeGreaterThanOrEqual(new Date('2025-03-01').getTime());
    });
  });

  test('date_to سفارش‌های بعد از آن تاریخ را حذف می‌کند', async () => {
    const res = await request(app)
      .get('/api/orders?date_to=2025-03-31')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((o) => {
      expect(new Date(o.order_date).getTime()).toBeLessThanOrEqual(new Date('2025-03-31T23:59:59.999Z').getTime());
    });
  });

  test('ترکیب date_from + date_to فقط سفارش‌های داخل بازه را برمی‌گرداند', async () => {
    const res = await request(app)
      .get('/api/orders?date_from=2025-03-01&date_to=2025-07-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2); // مارس + ژوئن
  });
});

describe('GET /api/orders — فیلتر مبلغ', () => {
  test('amount_min سفارش‌های کمتر از حد را حذف می‌کند', async () => {
    const res = await request(app)
      .get('/api/orders?amount_min=1000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((o) => {
      expect(Number(o.total_amount)).toBeGreaterThanOrEqual(1000000);
    });
  });

  test('amount_max سفارش‌های بیشتر از حد را حذف می‌کند', async () => {
    const res = await request(app)
      .get('/api/orders?amount_max=600000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((o) => {
      expect(Number(o.total_amount)).toBeLessThanOrEqual(600000);
    });
  });

  test('ترکیب amount_min + amount_max فقط سفارش‌های داخل بازه را برمی‌گرداند', async () => {
    const res = await request(app)
      .get('/api/orders?amount_min=400000&amount_max=1600000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2); // 500k + 1500k
  });
});

describe('GET /api/orders — ترکیب همه فیلترها', () => {
  test('date + amount با هم کار می‌کنند', async () => {
    const res = await request(app)
      .get('/api/orders?date_from=2025-01-01&date_to=2025-04-30&amount_min=1000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // فقط سفارش 1500k در مارس
    expect(Number(res.body.data[0].total_amount)).toBe(1500000);
  });
});

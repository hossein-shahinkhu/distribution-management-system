process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let warehouseToken;
let product;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-route-test@example.test' });
  adminToken = tokenFor(admin);
  const warehouseKeeper = await createUser({ roleName: 'warehouse_keeper', email: 'warehouse-route-test@example.test' });
  warehouseToken = tokenFor(warehouseKeeper);

  product = await Product.create({ sku: 'R-100', name: 'کالای مسیر', unit_price: 10000, stock_quantity: 100, reorder_level: 5 });
});

afterAll(async () => {
  await sequelize.close();
});

describe('CRUD مسیرها', () => {
  test('ایجاد مسیر جدید توسط ادمین', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'مسیر شمال شهر', description: 'محله‌های شمالی' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('مسیر شمال شهر');
  });

  test('جلوگیری از ثبت نام تکراری مسیر', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'مسیر شمال شهر' });

    expect(res.status).toBe(409);
  });

  test('کاربر غیر ادمین اجازه ساخت مسیر ندارد', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ name: 'مسیر جنوب شهر' });

    expect(res.status).toBe(403);
  });

  test('همه کاربران احراز هویت‌شده می‌توانند لیست مسیرها را ببینند', async () => {
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${warehouseToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((r) => r.name === 'مسیر شمال شهر')).toBe(true);
  });

  test('ویرایش و حذف مسیر توسط ادمین', async () => {
    const createRes = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'مسیر موقت' });

    const updateRes = await request(app)
      .put(`/api/routes/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'مسیر موقت ویرایش‌شده' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('مسیر موقت ویرایش‌شده');

    const deleteRes = await request(app)
      .delete(`/api/routes/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
  });
});

describe('فیلتر سفارش‌ها بر اساس مسیر مشتری', () => {
  test('لیست سفارش‌ها را می‌توان بر اساس route_id مشتری فیلتر کرد', async () => {
    const routeARes = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'مسیر الف' });
    const routeBRes = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'مسیر ب' });

    const customerA = await Customer.create({ full_name: 'مشتری الف', phone: '09121110001', route_id: routeARes.body.id });
    const customerB = await Customer.create({ full_name: 'مشتری ب', phone: '09121110002', route_id: routeBRes.body.id });

    const orderA = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerA.id, items: [{ product_id: product.id, quantity: 1 }] });
    const orderB = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customerB.id, items: [{ product_id: product.id, quantity: 1 }] });

    expect(orderA.status).toBe(201);
    expect(orderB.status).toBe(201);

    const filteredRes = await request(app)
      .get(`/api/orders?route_id=${routeARes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(filteredRes.status).toBe(200);
    const orderIds = filteredRes.body.data.map((o) => o.id);
    expect(orderIds).toContain(orderA.body.id);
    expect(orderIds).not.toContain(orderB.body.id);
  });

  test('مشتری را می‌توان با route_id ثبت و ویرایش کرد', async () => {
    const routeRes = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'مسیر ج' });

    const createRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'مشتری ج', phone: '09121110003', route_id: routeRes.body.id });

    expect(createRes.status).toBe(201);
    expect(createRes.body.route_id).toBe(routeRes.body.id);

    const updateRes = await request(app)
      .put(`/api/customers/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ route_id: null });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.route_id).toBeNull();
  });
});

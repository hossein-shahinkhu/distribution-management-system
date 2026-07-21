process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-product-test@example.test' });
  adminToken = tokenFor(admin);
});

afterAll(async () => {
  await sequelize.close();
});

describe('مدیریت کالا', () => {
  test('ایجاد کالای جدید توسط ادمین', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'P-001', name: 'روغن آفتابگردان ۱ لیتری', unit_price: 120000, stock_quantity: 50, reorder_level: 10 });

    expect(res.status).toBe(201);
    expect(res.body.sku).toBe('P-001');
    expect(res.body.stock_quantity).toBe(50);
  });

  test('جلوگیری از ثبت کد کالای تکراری (SKU)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'P-001', name: 'کالای تکراری', unit_price: 1000 });

    expect(res.status).toBe(409);
  });

  test('دریافت لیست کالاهای کم‌موجود', async () => {
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: 'P-002', name: 'برنج ۱۰ کیلویی', unit_price: 900000, stock_quantity: 3, reorder_level: 5 });

    const res = await request(app)
      .get('/api/products/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((p) => p.sku === 'P-002')).toBe(true);
  });

  test('دسترسی بدون توکن به لیست کالاها رد می‌شود', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  test('لیست کالاها به‌صورت صفحه‌بندی‌شده و قابل‌جستجو برمی‌گردد', async () => {
    const res = await request(app)
      .get('/api/products?search=برنج&page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.every((p) => p.name.includes('برنج'))).toBe(true);
  });
});

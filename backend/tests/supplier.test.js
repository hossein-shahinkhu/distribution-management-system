process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const { seedRoles, createUser } = require('./testUtils');
const { generateToken } = require('../src/utils/token');

let adminToken;
let salespersonToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-supplier-test@example.test' });
  adminToken = generateToken(admin);
  const salesperson = await createUser({ roleName: 'salesperson', email: 'salesperson-supplier-test@example.test' });
  salespersonToken = generateToken(salesperson);
});

afterAll(async () => {
  await sequelize.close();
});

describe('مدیریت تامین‌کنندگان', () => {
  test('ایجاد تامین‌کننده جدید توسط ادمین', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'شرکت پخش الف', contact_person: 'آقای رضایی', phone: '02112345678', payment_terms_days: 30 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('شرکت پخش الف');
    expect(res.body.is_active).toBe(true);
  });

  test('فروشنده اجازه ایجاد تامین‌کننده ندارد', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${salespersonToken}`)
      .send({ name: 'شرکت پخش ب', phone: '02112345000' });
    expect(res.status).toBe(403);
  });

  test('فروشنده اجازه مشاهده لیست تامین‌کنندگان را ندارد', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${salespersonToken}`);
    expect(res.status).toBe(403);
  });

  test('ویرایش و غیرفعال‌کردن تامین‌کننده توسط ادمین', async () => {
    const createRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'شرکت پخش موقت', phone: '02100000000' });

    const updateRes = await request(app)
      .put(`/api/suppliers/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'شرکت پخش موقت ویرایش‌شده' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('شرکت پخش موقت ویرایش‌شده');

    const deactivateRes = await request(app)
      .delete(`/api/suppliers/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deactivateRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/suppliers/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.body.is_active).toBe(false);
  });

  test('جستجوی تامین‌کنندگان بر اساس نام کار می‌کند', async () => {
    const res = await request(app)
      .get('/api/suppliers?search=شرکت پخش الف')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((s) => s.name === 'شرکت پخش الف')).toBe(true);
  });
});

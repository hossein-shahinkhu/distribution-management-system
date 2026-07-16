process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');
const { seedRoles, createUser } = require('./testUtils');

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
});

afterAll(async () => {
  await sequelize.close();
});

describe('احراز هویت', () => {
  test('ورود موفق با اطلاعات صحیح', async () => {
    await createUser({ roleName: 'admin', email: '[email protected]', password: 'Secure@123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '[email protected]', password: 'Secure@123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  test('ورود ناموفق با رمز عبور اشتباه', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '[email protected]', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  test('دسترسی به مسیر محافظت‌شده بدون توکن رد می‌شود', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('دسترسی به اطلاعات کاربر با توکن معتبر', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: '[email protected]', password: 'Secure@123' });

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('[email protected]');
  });
});

process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Distributor, Customer, Order } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let salesperson;
let distributor;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-commission-test@example.test' });
  adminToken = tokenFor(admin);

  salesperson = await createUser({ roleName: 'salesperson', email: 'salesperson-commission-test@example.test' });
  await salesperson.update({ commission_rate: 10 });

  distributor = await Distributor.create({
    full_name: 'توزیع‌کننده پورسانت',
    phone: '09123334455',
    commission_rate: 5,
  });

  const customer = await Customer.create({ full_name: 'مشتری پورسانت', phone: '09124445566' });

  // سفارش تحویل‌شده در بازه ژانویه ۲۰۲۶ — باید در محاسبه پورسانت لحاظ شود
  await Order.create({
    order_number: 'ORD-COMM-1',
    customer_id: customer.id,
    salesperson_id: salesperson.id,
    distributor_id: distributor.id,
    status: 'delivered',
    total_amount: 1000000,
    order_date: new Date('2026-01-15'),
  });

  // سفارشی که هنوز تحویل نشده — نباید در محاسبه پورسانت لحاظ شود
  await Order.create({
    order_number: 'ORD-COMM-2',
    customer_id: customer.id,
    salesperson_id: salesperson.id,
    distributor_id: distributor.id,
    status: 'pending',
    total_amount: 500000,
    order_date: new Date('2026-01-16'),
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('گزارش پورسانت', () => {
  test('محاسبه صحیح پورسانت فروشنده و توزیع‌کننده بر اساس سفارش‌های تحویل‌شده', async () => {
    const res = await request(app)
      .get('/api/reports/commissions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const spResult = res.body.find((r) => r.role === 'salesperson' && r.name === salesperson.full_name);
    expect(spResult).toBeDefined();
    expect(spResult.order_count).toBe(1);
    expect(Number(spResult.total_amount)).toBe(1000000);
    expect(Number(spResult.commission_amount)).toBe(100000); // 10% از ۱٬۰۰۰٬۰۰۰

    const distResult = res.body.find((r) => r.role === 'distributor' && r.name === distributor.full_name);
    expect(distResult).toBeDefined();
    expect(distResult.order_count).toBe(1);
    expect(Number(distResult.total_amount)).toBe(1000000);
    expect(Number(distResult.commission_amount)).toBe(50000); // 5% از ۱٬۰۰۰٬۰۰۰
  });

  test('فیلتر بازه زمانی، سفارش‌های خارج از بازه را از محاسبه حذف می‌کند', async () => {
    const res = await request(app)
      .get('/api/reports/commissions?from=2026-02-01&to=2026-02-28')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const spResult = res.body.find((r) => r.role === 'salesperson' && r.name === salesperson.full_name);
    expect(spResult.order_count).toBe(0);
    expect(Number(spResult.total_amount)).toBe(0);
    expect(Number(spResult.commission_amount)).toBe(0);
  });

  test('دسترسی کاربر غیر ادمین به گزارش پورسانت رد می‌شود', async () => {
    const spToken = tokenFor(salesperson);
    const res = await request(app)
      .get('/api/reports/commissions')
      .set('Authorization', `Bearer ${spToken}`);
    expect(res.status).toBe(403);
  });
});

process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer, Distributor } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let product;
let customer;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-ownership-test@example.test' });
  adminToken = tokenFor(admin);

  product = await Product.create({ sku: 'P-200', name: 'روغن ۵ لیتری', unit_price: 500000, stock_quantity: 30, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'فروشگاه دوم', phone: '09121111111' });
});

afterAll(async () => {
  await sequelize.close();
});

async function createDistributorWithUser(email) {
  const user = await createUser({ roleName: 'distributor', email });
  const distributor = await Distributor.create({ user_id: user.id, full_name: 'توزیع‌کننده تست', phone: '09122222222' });
  return { user, distributor, token: tokenFor(user) };
}

describe('کنترل مالکیت سفارش برای توزیع‌کننده', () => {
  test('توزیع‌کننده به سفارشی که به او تخصیص نیافته دسترسی ندارد (GET)', async () => {
    const { distributor: ownDistributor } = await createDistributorWithUser('dist-owner-a@example.test');
    const { token: otherToken } = await createDistributorWithUser('dist-other-a@example.test');

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, distributor_id: ownDistributor.id, items: [{ product_id: product.id, quantity: 1 }] });

    const res = await request(app)
      .get(`/api/orders/${orderRes.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  test('توزیع‌کننده صاحب سفارش می‌تواند آن را ببیند', async () => {
    const { distributor: ownDistributor, token: ownToken } = await createDistributorWithUser('dist-owner-b@example.test');

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, distributor_id: ownDistributor.id, items: [{ product_id: product.id, quantity: 1 }] });

    const res = await request(app)
      .get(`/api/orders/${orderRes.body.id}`)
      .set('Authorization', `Bearer ${ownToken}`);

    expect(res.status).toBe(200);
  });

  test('توزیع‌کننده نمی‌تواند وضعیت سفارش دیگری را تغییر دهد', async () => {
    const { distributor: ownDistributor } = await createDistributorWithUser('dist-owner-c@example.test');
    const { token: otherToken } = await createDistributorWithUser('dist-other-c@example.test');

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, distributor_id: ownDistributor.id, items: [{ product_id: product.id, quantity: 1 }] });

    const res = await request(app)
      .patch(`/api/orders/${orderRes.body.id}/status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(403);
  });
});

describe('جبران موجودی هنگام لغو سفارش', () => {
  test('لغو یک سفارش عادی، موجودی کسرشده را برمی‌گرداند', async () => {
    const before = await Product.findByPk(product.id);
    const stockBefore = before.stock_quantity;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 3 }] });

    const afterCreate = await Product.findByPk(product.id);
    expect(afterCreate.stock_quantity).toBe(stockBefore - 3);

    const cancelRes = await request(app)
      .patch(`/api/orders/${orderRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });

    expect(cancelRes.status).toBe(200);

    const afterCancel = await Product.findByPk(product.id);
    expect(afterCancel.stock_quantity).toBe(stockBefore);
  });

  test('لغو دوباره یک سفارش قبلاً لغوشده، موجودی را دوباره برنمی‌گرداند (idempotent)', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 2 }] });

    await request(app)
      .patch(`/api/orders/${orderRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });

    const afterFirstCancel = await Product.findByPk(product.id);

    const secondCancelRes = await request(app)
      .patch(`/api/orders/${orderRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });

    expect(secondCancelRes.status).toBe(400);

    const afterSecondCancel = await Product.findByPk(product.id);
    expect(afterSecondCancel.stock_quantity).toBe(afterFirstCancel.stock_quantity);
  });

  test('لغو یک پیش‌فاکتور، موجودی را تغییر نمی‌دهد (موجودی از ابتدا کسر نشده بود)', async () => {
    const before = await Product.findByPk(product.id);

    const quoteRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 4 }], is_quote: true });

    const cancelRes = await request(app)
      .patch(`/api/orders/${quoteRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled', confirmed_not_dispatched: true });

    expect(cancelRes.status).toBe(400);

    const after = await Product.findByPk(product.id);
    expect(after.stock_quantity).toBe(before.stock_quantity);
  });
});

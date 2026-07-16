process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer } = require('../src/models');
const { seedRoles, createUser } = require('./testUtils');
const { generateToken } = require('../src/utils/token');

let adminToken;
let warehouseToken;
let product;
let customer;

async function createInvoice() {
  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ customer_id: customer.id, items: [{ product_id: product.id, quantity: 10 }] });

  const invoiceRes = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ order_id: orderRes.body.id });

  return invoiceRes.body; // total_amount = 1,000,000 + 9% مالیات = 1,090,000
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-treasury-test@example.test' });
  adminToken = generateToken(admin);
  const warehouseKeeper = await createUser({ roleName: 'warehouse_keeper', email: 'warehouse-treasury-test@example.test' });
  warehouseToken = generateToken(warehouseKeeper);

  product = await Product.create({ sku: 'T-100', name: 'کالای خزانه‌داری', unit_price: 100000, stock_quantity: 100, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'مشتری خزانه‌داری', phone: '09127778899' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('دسترسی به خزانه‌داری', () => {
  test('کاربر انباردار اجازه ثبت تراکنش ندارد', async () => {
    const res = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ type: 'receipt', amount: 1000, method: 'cash' });
    expect(res.status).toBe(403);
  });

  test('کاربر انباردار اجازه مشاهده لیست تراکنش‌ها را ندارد', async () => {
    const res = await request(app)
      .get('/api/treasury')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });
});

describe('همزمانی خودکار وضعیت پرداخت فاکتور', () => {
  test('ثبت دریافت جزئی، فاکتور را partial می‌کند', async () => {
    const invoice = await createInvoice();
    expect(Number(invoice.total_amount)).toBe(1090000);

    const res = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'receipt',
        amount: 500000,
        method: 'cash',
        customer_id: customer.id,
        invoice_id: invoice.id,
      });

    expect(res.status).toBe(201);

    const invoiceCheck = await request(app)
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invoiceCheck.body.payment_status).toBe('partial');
  });

  test('ثبت باقی‌مانده دریافت، فاکتور را paid می‌کند و باطل‌کردن آن را برمی‌گرداند', async () => {
    const invoice = await createInvoice();

    const firstReceipt = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 500000, method: 'cash', customer_id: customer.id, invoice_id: invoice.id });

    const secondReceipt = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 590000, method: 'bank_transfer', customer_id: customer.id, invoice_id: invoice.id });

    expect(secondReceipt.status).toBe(201);

    const afterFullPayment = await request(app)
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterFullPayment.body.payment_status).toBe('paid');

    // باطل‌کردن دریافت دوم باید فاکتور را دوباره partial کند
    const voidRes = await request(app)
      .patch(`/api/treasury/${secondReceipt.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(voidRes.status).toBe(200);
    expect(voidRes.body.is_voided).toBe(true);

    const afterVoid = await request(app)
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterVoid.body.payment_status).toBe('partial');

    // باطل‌کردن دریافت اول باید فاکتور را به unpaid برگرداند
    await request(app)
      .patch(`/api/treasury/${firstReceipt.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`);

    const afterBothVoided = await request(app)
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterBothVoided.body.payment_status).toBe('unpaid');
  });

  test('باطل‌کردن یک تراکنش قبلاً باطل‌شده رد می‌شود', async () => {
    const invoice = await createInvoice();
    const receipt = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 1090000, method: 'cash', invoice_id: invoice.id });

    await request(app).patch(`/api/treasury/${receipt.body.id}/void`).set('Authorization', `Bearer ${adminToken}`);

    const secondVoid = await request(app)
      .patch(`/api/treasury/${receipt.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(secondVoid.status).toBe(400);
  });
});

describe('لیست و فیلتر تراکنش‌ها', () => {
  test('لیست تراکنش‌ها بر اساس نوع فیلتر می‌شود', async () => {
    await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'payment', amount: 20000, method: 'cash', description: 'خرید لوازم اداری' });

    const res = await request(app)
      .get('/api/treasury?type=payment')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t) => t.type === 'payment')).toBe(true);
  });

  test('ثبت تراکنش با مبلغ نامعتبر رد می‌شود', async () => {
    const res = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: -100, method: 'cash' });
    expect(res.status).toBe(400);
  });
});

describe('گزارش مانده خزانه‌داری', () => {
  test('جمع دریافت/پرداخت و تفکیک بر اساس روش را درست محاسبه می‌کند و تراکنش باطل‌شده را نادیده می‌گیرد', async () => {
    await sequelize.models.TreasuryTransaction.destroy({ where: {} });

    await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 300000, method: 'cash' });
    await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 200000, method: 'bank_transfer' });
    const paymentRes = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'payment', amount: 100000, method: 'cash' });

    // این تراکنش باطل می‌شود و نباید در گزارش لحاظ شود
    const voidedReceipt = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 999999, method: 'card' });
    await request(app).patch(`/api/treasury/${voidedReceipt.body.id}/void`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/api/reports/treasury-balance')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.totalReceipts)).toBe(500000);
    expect(Number(res.body.totalPayments)).toBe(100000);
    expect(Number(res.body.netBalance)).toBe(400000);
    expect(Number(res.body.byMethod.cash.receipts)).toBe(300000);
    expect(Number(res.body.byMethod.cash.payments)).toBe(100000);
    expect(Number(res.body.byMethod.bank_transfer.receipts)).toBe(200000);
    expect(res.body.byMethod.card).toBeUndefined();

    expect(paymentRes.status).toBe(201);
  });

  test('کاربر غیر ادمین به گزارش مانده خزانه‌داری دسترسی ندارد', async () => {
    const res = await request(app)
      .get('/api/reports/treasury-balance')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });
});

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
  const admin = await createUser({ roleName: 'admin', email: 'admin-credit-test@example.test' });
  adminToken = tokenFor(admin);
  const warehouseKeeper = await createUser({ roleName: 'warehouse_keeper', email: 'warehouse-credit-test@example.test' });
  warehouseToken = tokenFor(warehouseKeeper);

  product = await Product.create({ sku: 'CR-100', name: 'کالای اعتباری', unit_price: 100000, stock_quantity: 100, reorder_level: 5 });
});

afterAll(async () => {
  await sequelize.close();
});

async function createOrderAndInvoice(customerId, quantity) {
  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ customer_id: customerId, items: [{ product_id: product.id, quantity }] });

  const invoiceRes = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ order_id: orderRes.body.id });

  return invoiceRes.body;
}

describe('محاسبه اعتبار مشتری', () => {
  test('فاکتور پرداخت‌نشده و پرداخت جزئی هر دو در بدهی جاری حساب می‌شوند', async () => {
    const customer = await Customer.create({ full_name: 'مشتری اعتباری یک', phone: '09123334444', credit_limit: 5000000 });

    const invoiceUnpaid = await createOrderAndInvoice(customer.id, 1); // 100000 + 9% مالیات = 109000
    const invoicePartial = await createOrderAndInvoice(customer.id, 2); // 200000 + 9% = 218000

    // پرداخت جزئی روی فاکتور دوم
    await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 100000, method: 'cash', customer_id: customer.id, invoice_id: invoicePartial.id });

    const res = await request(app)
      .get(`/api/customers/${customer.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.credit_limit).toBe(5000000);
    // بدهی = کل فاکتور اول (109000) + باقی‌مانده فاکتور دوم (218000 - 100000 = 118000)
    expect(res.body.outstanding_balance).toBe(Number(invoiceUnpaid.total_amount) + (Number(invoicePartial.total_amount) - 100000));
    expect(res.body.unpaid_invoice_count).toBe(2);
    expect(res.body.available_credit).toBe(5000000 - res.body.outstanding_balance);
  });

  test('یک رسید باطل‌شده در محاسبه بدهی لحاظ نمی‌شود (بدهی کامل باقی می‌ماند)', async () => {
    const customer = await Customer.create({ full_name: 'مشتری اعتباری دو', phone: '09125556666', credit_limit: 1000000 });
    const invoice = await createOrderAndInvoice(customer.id, 1); // total 109000

    const receiptRes = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 109000, method: 'cash', customer_id: customer.id, invoice_id: invoice.id });

    // باطل کردن رسید؛ فاکتور باید دوباره به‌طور کامل بدهکار حساب شود
    await request(app)
      .patch(`/api/treasury/${receiptRes.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`/api/customers/${customer.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.outstanding_balance).toBe(Number(invoice.total_amount));
    expect(res.body.unpaid_invoice_count).toBe(1);
  });

  test('فاکتور کاملاً پرداخت‌شده در بدهی جاری یا تعداد فاکتور پرداخت‌نشده حساب نمی‌شود', async () => {
    const customer = await Customer.create({ full_name: 'مشتری اعتباری سه', phone: '09127778888', credit_limit: 1000000 });
    const invoice = await createOrderAndInvoice(customer.id, 1); // total 109000

    await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 109000, method: 'cash', customer_id: customer.id, invoice_id: invoice.id });

    const res = await request(app)
      .get(`/api/customers/${customer.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.outstanding_balance).toBe(0);
    expect(res.body.unpaid_invoice_count).toBe(0);
    expect(res.body.available_credit).toBe(1000000);
  });

  test('انباردار اجازه دسترسی به اعتبار مشتری را ندارد', async () => {
    const customer = await Customer.create({ full_name: 'مشتری اعتباری چهار', phone: '09129990000' });
    const res = await request(app)
      .get(`/api/customers/${customer.id}/credit-usage`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });

  test('مشتری ناموجود، ۴۰۴ برمی‌گرداند', async () => {
    const res = await request(app)
      .get('/api/customers/999999/credit-usage')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

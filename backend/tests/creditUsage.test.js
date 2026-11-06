process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Customer, Product, Order, OrderItem, Invoice, TreasuryTransaction } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
const { generateInvoiceNumber } = require('../src/utils/numberGenerator');

let adminToken;
let salespersonToken;
let warehouseToken;
let customer;
let product;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();

  const admin = await createUser({ roleName: 'admin', email: 'admin-credit-test@example.test' });
  adminToken = tokenFor(admin);

  const salesperson = await createUser({ roleName: 'salesperson', email: 'sp-credit-test@example.test' });
  salespersonToken = tokenFor(salesperson);

  const warehouse = await createUser({ roleName: 'warehouse_keeper', email: 'wh-credit-test@example.test' });
  warehouseToken = tokenFor(warehouse);

  product  = await Product.create({ sku: 'CU-100', name: 'کالای اعتبار', unit_price: 100000, stock_quantity: 999, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'مشتری اعتبار', phone: '09120000099', credit_limit: 5000000 });
});

afterAll(async () => {
  await sequelize.close();
});

/** Helper: create an order + invoice for the test customer */
async function createOrderWithInvoice(quantity) {
  const order = await Order.create({
    order_number: `ORD-TEST-${Math.random().toString(36).slice(2, 8)}`,
    customer_id:  customer.id,
    total_amount: quantity * 100000,
    status:       'pending',
    is_quote:     false,
  });
  await OrderItem.create({
    order_id:   order.id,
    product_id: product.id,
    quantity,
    unit_price: 100000,
    line_total: quantity * 100000,
  });
  const total = quantity * 100000;
  const tax   = Math.round(total * 0.09);
  const invoice = await Invoice.create({
    invoice_number: generateInvoiceNumber(),
    order_id:       order.id,
    subtotal:       total,
    tax_amount:     tax,
    total_amount:   total + tax,
    payment_status: 'unpaid',
  });
  return { order, invoice };
}

// ─────────────────────────────────────────────────────────────
describe('GET /api/customers/:id/credit-usage — دسترسی', () => {
  test('ادمین دسترسی دارد', async () => {
    const res = await request(app)
      .get(`/api/customers/${customer.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('فروشنده بدون سفارش متعلق به خود دسترسی مالی ندارد', async () => {
    const res = await request(app)
      .get(`/api/customers/${customer.id}/credit-usage`)
      .set('Authorization', `Bearer ${salespersonToken}`);
    expect(res.status).toBe(404);
  });

  test('انباردار دسترسی ندارد', async () => {
    const res = await request(app)
      .get(`/api/customers/${customer.id}/credit-usage`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });

  test('مشتری ناموجود ۴۰۴ برمی‌گرداند', async () => {
    const res = await request(app)
      .get('/api/customers/999999/credit-usage')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/customers/:id/credit-usage — محاسبه', () => {
  test('مشتری بدون فاکتور — مانده صفر است', async () => {
    const fresh = await Customer.create({ full_name: 'مشتری خالی', phone: '09129990001', credit_limit: 1000000 });
    const res = await request(app)
      .get(`/api/customers/${fresh.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.outstanding_balance).toBe(0);
    expect(res.body.unpaid_invoices).toBe(0);
    expect(res.body.available_credit).toBe(1000000);
  });

  test('فاکتور پرداخت‌نشده — مانده برابر مبلغ کل فاکتور است', async () => {
    const fresh = await Customer.create({ full_name: 'مشتری فاکتور', phone: '09129990002', credit_limit: 2000000 });
    // temporarily override customer for this subtest
    const savedCustomer = customer;
    customer = fresh;
    const { invoice } = await createOrderWithInvoice(3); // 3 × 100000 = 300000 + 9% tax = 327000
    customer = savedCustomer;

    const res = await request(app)
      .get(`/api/customers/${fresh.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.outstanding_balance).toBeCloseTo(Number(invoice.total_amount), 0);
    expect(res.body.unpaid_invoices).toBe(1);
  });

  test('دریافت جزئی — مانده بدهی کاهش می‌یابد (نه کل فاکتور)', async () => {
    const fresh = await Customer.create({ full_name: 'مشتری جزئی', phone: '09129990003', credit_limit: 3000000 });
    const savedCustomer = customer;
    customer = fresh;
    const { invoice } = await createOrderWithInvoice(2); // total ≈ 218000
    customer = savedCustomer;

    const adminUser = await createUser({ roleName: 'admin', email: `admin-cu-partial-${Date.now()}@example.test` });
    const partialPayment = Math.round(Number(invoice.total_amount) / 2);
    await TreasuryTransaction.create({
      type:             'receipt',
      amount:           partialPayment,
      method:           'cash',
      invoice_id:       invoice.id,
      customer_id:      fresh.id,
      created_by:       adminUser.id,
      is_voided:        false,
      transaction_date: new Date(),
    });
    await invoice.update({ payment_status: 'partial' });

    const res = await request(app)
      .get(`/api/customers/${fresh.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const expected = Number(invoice.total_amount) - partialPayment;
    expect(res.body.outstanding_balance).toBeCloseTo(expected, 0);
    expect(res.body.unpaid_invoices).toBe(1);
  });

  test('فاکتور تسویه‌شده در مانده بدهی محاسبه نمی‌شود', async () => {
    const fresh = await Customer.create({ full_name: 'مشتری تسویه', phone: '09129990004', credit_limit: 1000000 });
    const savedCustomer = customer;
    customer = fresh;
    const { invoice } = await createOrderWithInvoice(1);
    customer = savedCustomer;

    const receipt = await request(app).post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: Number(invoice.total_amount), method: 'cash', invoice_id: invoice.id });
    expect(receipt.status).toBe(201);

    const res = await request(app)
      .get(`/api/customers/${fresh.id}/credit-usage`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.outstanding_balance).toBe(0);
    expect(res.body.unpaid_invoices).toBe(0);
  });
});

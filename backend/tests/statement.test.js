process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer, Supplier } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let salespersonToken;
let warehouseToken;
let product;
let customer;
let supplier;

// Helpers ──────────────────────────────────────────────────────────────────────

async function createOrder(token, customerId) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ customer_id: customerId, items: [{ product_id: product.id, quantity: 1 }] });
  return res.body;
}

async function createInvoice(token, orderId, taxRate) {
  const body = { order_id: orderId };
  if (taxRate !== undefined) body.tax_rate = taxRate;
  const res = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
  return res.body;
}

async function createReceipt(token, customerId, invoiceId, amount) {
  const res = await request(app)
    .post('/api/treasury')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'receipt', amount, method: 'cash',
      transaction_date: new Date().toISOString().slice(0, 10),
      customer_id: customerId,
      invoice_id: invoiceId,
    });
  return res.body;
}

// ──────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();

  const admin = await createUser({ roleName: 'admin', email: 'admin-stmt@example.test' });
  adminToken = tokenFor(admin);

  const salesperson = await createUser({ roleName: 'salesperson', email: 'salesperson-stmt@example.test' });
  salespersonToken = tokenFor(salesperson);

  const warehouse = await createUser({ roleName: 'warehouse_keeper', email: 'warehouse-stmt@example.test' });
  warehouseToken = tokenFor(warehouse);

  product  = await Product.create({ sku: 'STMT-001', name: 'کالای صورتحساب', unit_price: 100000, stock_quantity: 200, reorder_level: 5 });
  customer = await Customer.create({ full_name: 'مشتری صورتحساب', phone: '09120000010' });
  supplier = await Supplier.create({ name: 'تامین‌کننده صورتحساب', phone: '09120000020' });
});

afterAll(async () => {
  await sequelize.close();
});

// ══════════════════════════════════════════════════════════════════════════════
// گردش مالی مشتری
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/customers/:id/statement — گردش مالی مشتری', () => {
  test('بازگشت ساختار صحیح برای مشتری بدون تراکنش', async () => {
    const c = await Customer.create({ full_name: 'مشتری خالی', phone: '09120000099' });
    const res = await request(app)
      .get(`/api/customers/${c.id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      customer:        { id: c.id },
      opening_balance: 0,
      closing_balance: 0,
      entries:         [],
    });
  });

  test('یک فاکتور و یک رسید جزئی — مانده صحیح محاسبه می‌شود', async () => {
    // آماده کردن داده: سفارش → فاکتور → رسید جزئی
    const order   = await createOrder(adminToken, customer.id);
    const invoice = await createInvoice(adminToken, order.id, 0); // tax=0 → total=100000
    await createReceipt(adminToken, customer.id, invoice.id, 40000);

    const res = await request(app)
      .get(`/api/customers/${customer.id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { entries, closing_balance } = res.body;
    expect(entries.length).toBeGreaterThanOrEqual(2);
    // آخرین مانده باید مثبت باشد (بدهی باقی‌مانده)
    expect(closing_balance).toBeGreaterThan(0);
    // اولین ردیف از نوع invoice است (بدهکار)
    const invoiceEntry = entries.find((e) => e.type === 'invoice');
    expect(invoiceEntry).toBeDefined();
    expect(invoiceEntry.debit).toBe(100000);
    expect(invoiceEntry.credit).toBe(0);
    // رسید بستانکار
    const receiptEntry = entries.find((e) => e.type === 'receipt');
    expect(receiptEntry).toBeDefined();
    expect(receiptEntry.credit).toBe(40000);
    expect(receiptEntry.debit).toBe(0);
  });

  test('فیلتر بازه تاریخ — تراکنش‌های قبل از from حذف می‌شوند', async () => {
    const futureDate = '2099-01-01';
    const res = await request(app)
      .get(`/api/customers/${customer.id}/statement?from=${futureDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(0);
    const full = await request(app)
      .get(`/api/customers/${customer.id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.opening_balance).toBe(full.body.closing_balance);
    expect(res.body.closing_balance).toBe(full.body.closing_balance);
  });

  test('دسترسی warehouse_keeper به گردش مالی مشتری رد می‌شود (403)', async () => {
    const res = await request(app)
      .get(`/api/customers/${customer.id}/statement`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });

  test('مشتری غیرموجود — 404', async () => {
    const res = await request(app)
      .get('/api/customers/99999/statement')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// گردش مالی تامین‌کننده
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/suppliers/:id/statement — گردش مالی تامین‌کننده', () => {
  test('بازگشت ساختار صحیح برای تامین‌کننده بدون فاکتور خرید', async () => {
    const s = await Supplier.create({ name: 'تامین‌کننده خالی', phone: '09120000098' });
    const res = await request(app)
      .get(`/api/suppliers/${s.id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      supplier:        { id: s.id },
      opening_balance: 0,
      closing_balance: 0,
      entries:         [],
    });
  });

  test('یک فاکتور خرید — مانده بدهی صحیح است', async () => {
    // ایجاد فاکتور خرید مستقیم برای تامین‌کننده
    const piRes = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_number: 'S-STMT-001',
        supplier_id:    supplier.id,
        issue_date:     new Date().toISOString().slice(0, 10),
        subtotal:       500000,
        tax_amount:     0,
        total_amount:   500000,
      });
    expect(piRes.status).toBe(201);

    const res = await request(app)
      .get(`/api/suppliers/${supplier.id}/statement`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { entries, closing_balance } = res.body;
    expect(entries.some((e) => e.type === 'invoice' && e.debit === 500000)).toBe(true);
    expect(closing_balance).toBeGreaterThanOrEqual(500000);
  });

  test('فیلتر بازه تاریخ کار می‌کند', async () => {
    const futureDate = '2099-01-01';
    const res = await request(app)
      .get(`/api/suppliers/${supplier.id}/statement?from=${futureDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(0);
  });

  test('دسترسی salesperson به گردش مالی تامین‌کننده رد می‌شود (403)', async () => {
    const res = await request(app)
      .get(`/api/suppliers/${supplier.id}/statement`)
      .set('Authorization', `Bearer ${salespersonToken}`);
    expect(res.status).toBe(403);
  });

  test('تامین‌کننده غیرموجود — 404', async () => {
    const res = await request(app)
      .get('/api/suppliers/99999/statement')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

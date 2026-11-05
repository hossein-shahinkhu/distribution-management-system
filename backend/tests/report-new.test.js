process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Product, Customer, Supplier } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let warehouseToken;
let salespersonToken;
let product;
let customer;
let supplier1;
let supplier2;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();

  const admin = await createUser({ roleName: 'admin', email: 'admin-reports@example.test' });
  adminToken = tokenFor(admin);
  const warehouse = await createUser({ roleName: 'warehouse_keeper', email: 'wh-reports@example.test' });
  warehouseToken = tokenFor(warehouse);
  const salesperson = await createUser({ roleName: 'salesperson', email: 'sp-reports@example.test' });
  salespersonToken = tokenFor(salesperson);

  product   = await Product.create({ sku: 'RPT-001', name: 'کالای گزارش', unit_price: 50000, stock_quantity: 100, reorder_level: 5 });
  customer  = await Customer.create({ full_name: 'مشتری گزارش', phone: '09129990001' });
  supplier1 = await Supplier.create({ name: 'تامین‌کننده ۱', phone: '09129990002' });
  supplier2 = await Supplier.create({ name: 'تامین‌کننده ۲', phone: '09129990003' });
});

afterAll(async () => {
  await sequelize.close();
});

// ── helper
async function createPurchaseInvoice(token, supplierId, num, total) {
  return request(app)
    .post('/api/purchase-invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({ invoice_number: num, supplier_id: supplierId, subtotal: total, tax_amount: 0, total_amount: total });
}

describe('GET /api/reports/purchasing — گزارش خرید', () => {
  test('دو تامین‌کننده با فاکتورهای مختلف — مجموع صحیح هر کدام', async () => {
    await createPurchaseInvoice(adminToken, supplier1.id, 'P-R-001', 300000);
    await createPurchaseInvoice(adminToken, supplier1.id, 'P-R-002', 200000);
    await createPurchaseInvoice(adminToken, supplier2.id, 'P-R-003', 450000);

    const res = await request(app)
      .get('/api/reports/purchasing')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const s1 = res.body.find((r) => r.supplier_id === supplier1.id);
    const s2 = res.body.find((r) => r.supplier_id === supplier2.id);
    expect(s1).toBeDefined();
    expect(s2).toBeDefined();
    expect(s1.total_amount).toBe(500000);
    expect(s2.total_amount).toBe(450000);
    expect(s1.invoice_count).toBe(2);
  });

  test('warehouse_keeper دسترسی دارد', async () => {
    const res = await request(app)
      .get('/api/reports/purchasing')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(200);
  });

  test('salesperson دسترسی ندارد (403)', async () => {
    const res = await request(app)
      .get('/api/reports/purchasing')
      .set('Authorization', `Bearer ${salespersonToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/reports/overview — نمای کلی', () => {
  test('ساختار پاسخ صحیح است', async () => {
    const res = await request(app)
      .get('/api/reports/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const keys = ['monthly_sales', 'monthly_purchases', 'pending_delivery', 'treasury_balance', 'low_stock_count', 'outstanding_receivables'];
    keys.forEach((k) => expect(res.body).toHaveProperty(k));
  });

  test('salesperson دسترسی ندارد (403)', async () => {
    const res = await request(app)
      .get('/api/reports/overview')
      .set('Authorization', `Bearer ${salespersonToken}`);
    expect(res.status).toBe(403);
  });

  test('warehouse_keeper دسترسی ندارد (403)', async () => {
    const res = await request(app)
      .get('/api/reports/overview')
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(res.status).toBe(403);
  });
});

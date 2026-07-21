process.env.JWT_SECRET = 'test_secret';

const request = require('supertest');
const app = require('../src/app');
const { sequelize, Supplier } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');

let adminToken;
let warehouseToken;
let salespersonToken;
let supplier;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedRoles();
  const admin = await createUser({ roleName: 'admin', email: 'admin-pinv-test@example.test' });
  adminToken = tokenFor(admin);
  const warehouseKeeper = await createUser({ roleName: 'warehouse_keeper', email: 'warehouse-pinv-test@example.test' });
  warehouseToken = tokenFor(warehouseKeeper);
  const salesperson = await createUser({ roleName: 'salesperson', email: 'salesperson-pinv-test@example.test' });
  salespersonToken = tokenFor(salesperson);

  supplier = await Supplier.create({ name: 'تامین‌کننده فاکتور خرید', phone: '09121110000' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('ثبت فاکتور خرید', () => {
  test('فروشنده اجازه ثبت فاکتور خرید ندارد', async () => {
    const res = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${salespersonToken}`)
      .send({ invoice_number: 'SUP-INV-1', supplier_id: supplier.id, subtotal: 100000, total_amount: 100000 });
    expect(res.status).toBe(403);
  });

  test('ثبت مستقیم فاکتور خرید (بدون سفارش خرید) توسط انباردار', async () => {
    const res = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ invoice_number: 'SUP-INV-100', supplier_id: supplier.id, subtotal: 1000000, tax_amount: 90000, total_amount: 1090000 });

    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe('unpaid');
    expect(Number(res.body.total_amount)).toBe(1090000);
  });

  test('دو تامین‌کننده مختلف می‌توانند شماره فاکتور یکسان داشته باشند، اما یک تامین‌کننده نه', async () => {
    const duplicateRes = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ invoice_number: 'SUP-INV-100', supplier_id: supplier.id, subtotal: 5000, total_amount: 5000 });
    expect(duplicateRes.status).toBe(409);

    const otherSupplier = await Supplier.create({ name: 'تامین‌کننده دوم', phone: '09121110001' });
    const otherSupplierRes = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ invoice_number: 'SUP-INV-100', supplier_id: otherSupplier.id, subtotal: 5000, total_amount: 5000 });
    expect(otherSupplierRes.status).toBe(201);
  });

  test('ثبت فاکتور خرید از روی یک سفارش خرید (تامین‌کننده به‌صورت خودکار استخراج می‌شود)', async () => {
    const poRes = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_id: supplier.id,
        items: [{ product_id: (await createTestProduct()).id, quantity: 2, unit_cost: 50000 }],
      });

    const invoiceRes = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_number: 'SUP-INV-FROM-PO',
        purchase_order_id: poRes.body.id,
        subtotal: poRes.body.total_amount,
        total_amount: poRes.body.total_amount,
      });

    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.supplier_id).toBe(supplier.id);
  });
});

describe('همزمانی خودکار وضعیت پرداخت فاکتور خرید', () => {
  test('پرداخت جزئی، فاکتور خرید را partial و تسویه کامل آن را paid می‌کند؛ باطل‌کردن برمی‌گرداند', async () => {
    const invoiceRes = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ invoice_number: 'SUP-INV-SYNC', supplier_id: supplier.id, subtotal: 1000000, total_amount: 1000000 });

    const firstPayment = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'payment', amount: 400000, method: 'bank_transfer', purchase_invoice_id: invoiceRes.body.id });
    expect(firstPayment.status).toBe(201);

    const afterFirstPayment = await request(app)
      .get(`/api/purchase-invoices/${invoiceRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterFirstPayment.body.payment_status).toBe('partial');

    const secondPayment = await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'payment', amount: 600000, method: 'cash', purchase_invoice_id: invoiceRes.body.id });
    expect(secondPayment.status).toBe(201);

    const afterFullPayment = await request(app)
      .get(`/api/purchase-invoices/${invoiceRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterFullPayment.body.payment_status).toBe('paid');

    const voidRes = await request(app)
      .patch(`/api/treasury/${secondPayment.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(voidRes.status).toBe(200);

    const afterVoid = await request(app)
      .get(`/api/purchase-invoices/${invoiceRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterVoid.body.payment_status).toBe('partial');

    await request(app)
      .patch(`/api/treasury/${firstPayment.body.id}/void`)
      .set('Authorization', `Bearer ${adminToken}`);

    const afterBothVoided = await request(app)
      .get(`/api/purchase-invoices/${invoiceRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterBothVoided.body.payment_status).toBe('unpaid');
  });

  test('دریافت (receipt) نباید روی وضعیت پرداخت فاکتور خرید تأثیر بگذارد', async () => {
    const invoiceRes = await request(app)
      .post('/api/purchase-invoices')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ invoice_number: 'SUP-INV-RECEIPT-IGNORE', supplier_id: supplier.id, subtotal: 200000, total_amount: 200000 });

    // ثبت یک دریافت (نه پرداخت) با ارجاع اشتباه به purchase_invoice_id نباید فاکتور خرید را تغییر دهد
    await request(app)
      .post('/api/treasury')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'receipt', amount: 200000, method: 'cash', purchase_invoice_id: invoiceRes.body.id });

    const check = await request(app)
      .get(`/api/purchase-invoices/${invoiceRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(check.body.payment_status).toBe('unpaid');
  });
});

async function createTestProduct() {
  const { Product } = require('../src/models');
  return Product.create({
    sku: `PU-INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: 'کالای فاکتور خرید',
    unit_price: 60000,
    stock_quantity: 10,
    reorder_level: 2,
  });
}

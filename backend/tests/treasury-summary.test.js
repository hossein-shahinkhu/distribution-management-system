process.env.JWT_SECRET = 'test_secret';
jest.mock('../src/config/database', () => {
  const { Sequelize } = require('sequelize');
  if (process.env.NODE_ENV !== 'test') throw new Error('Test environment required');
  const url = process.env.TREASURY_SUMMARY_TEST_DATABASE_URL;
  if (!url) return new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false, define: { underscored: true, timestamps: true } });
  if (!decodeURIComponent(new URL(url).pathname).endsWith('_test')) throw new Error('Isolated test database required');
  return new Sequelize(url, { logging: false, define: { underscored: true, timestamps: true, schema: `treasury_summary_${require('crypto').randomBytes(8).toString('hex')}` } });
});
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Customer, Order, Invoice, TreasuryTransaction } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
const tokens = {}, users = {};
let customer, own, other, purchase;
const pg = Boolean(process.env.TREASURY_SUMMARY_TEST_DATABASE_URL);
beforeAll(async () => {
  if (pg) await sequelize.createSchema(sequelize.options.define.schema);
  await sequelize.sync({ force: true }); await seedRoles();
  for (const role of ['admin', 'salesperson', 'warehouse_keeper', 'distributor']) {
    users[role] = await createUser({ roleName: role, email: `summary-${role}@example.test` }); tokens[role] = tokenFor(users[role]);
  }
  customer = await Customer.create({ full_name: 'Summary customer', phone: '09120000000' });
  async function invoice(name, owner) {
    const order = await Order.create({ order_number:name, customer_id:customer.id, salesperson_id:owner, total_amount:1000 });
    return Invoice.create({ invoice_number:name, order_id:order.id, subtotal:1000, total_amount:1000 });
  }
  own = await invoice('SUMMARY-OWN',users.salesperson.id); other = await invoice('SUMMARY-OTHER',users.admin.id);
  for (const [index,value] of [50,168,30,79,...Array(21).fill(1)].entries()) {
    await TreasuryTransaction.create({ type:'receipt',amount:value,method:'cash',invoice_id:own.id,customer_id:customer.id,
      created_by:users.admin.id,transaction_date:new Date(Date.UTC(2026,0,2,12,0,index)) });
  }
});
afterAll(async () => { if (pg) await sequelize.dropSchema(sequelize.options.define.schema,{cascade:true}); await sequelize.close(); });
const get = (query='',role='admin') => request(app).get('/api/treasury'+query).set('Authorization',`Bearer ${tokens[role]}`);
test('25 records: summary is 348 on both pages of size 20',async()=>{
  for (const [page,size] of [[1,20],[2,5]]) {
    const r=await get(`?include_summary=true&limit=20&page=${page}`);
    expect(r.status).toBe(200); expect(r.body.data).toHaveLength(size); expect(r.body.pagination.total).toBe(25);
    expect(r.body.summary).toEqual({total_receipts:'348.00',total_payments:'0.00',net_balance:'348.00'});
    if(page===1) expect(r.body.data[0].running_balance).toBe('348.00');
    if(page===2) expect(r.body.data.at(-1).running_balance).toBe('50.00');
  }
});
test('legacy response stays paginated without summary or running fields',async()=>{
  const r=await get('?limit=20'); expect(r.status).toBe(200); expect(r.body.summary).toBeUndefined(); expect(r.body.data[0].running_balance).toBeUndefined();
});
test('inclusive date end, type and invoice filters share summary and row scope',async()=>{
  const r=await get(`?include_summary=true&from=2026-01-02&to=2026-01-02&type=receipt&invoice_id=${own.id}&limit=1`);
  expect(r.status).toBe(200); expect(r.body.pagination.total).toBe(25); expect(r.body.summary.total_receipts).toBe('348.00'); expect(r.body.data[0].running_balance).toBe('348.00');
});
test('empty results include explicit zero totals even beyond last page',async()=>{
  const empty=await get('?include_summary=true&from=2099-01-01'); expect(empty.status).toBe(200); expect(empty.body.data).toEqual([]); expect(empty.body.summary).toEqual({total_receipts:'0.00',total_payments:'0.00',net_balance:'0.00'});
  const distant=await get('?include_summary=true&page=999'); expect(distant.body.data).toEqual([]); expect(distant.body.summary.total_receipts).toBe('348.00');
});
test.each(['?from=invalid','?to=invalid','?from=2026-01-03&to=2026-01-01','?is_voided=invalid'])('invalid filter %s returns 400 without financial details',async query=>{
  const r=await get(query+'&include_summary=true'); expect(r.status).toBe(400); expect(Object.keys(r.body)).toEqual(['message']);
});
test.each(['warehouse_keeper','distributor'])('%s cannot read summaries',async role=>{
  const r=await get('?include_summary=true',role); expect(r.status).toBe(403); expect(Object.keys(r.body)).toEqual(['message']);
});
describe('additional filters, ownership and precision',()=>{
  beforeAll(async()=>{
    const { Supplier, PurchaseInvoice }=require('../src/models');
    const supplier=await Supplier.create({name:'Summary supplier',phone:'09120000001'});
    purchase=await PurchaseInvoice.create({invoice_number:'SUMMARY-PURCHASE',supplier_id:supplier.id,subtotal:7.25,total_amount:7.25});
    const base={method:'cash',created_by:users.admin.id,transaction_date:new Date('2026-01-03T12:00:00Z')};
    await TreasuryTransaction.bulkCreate([
      {...base,type:'receipt',amount:100,invoice_id:other.id,customer_id:customer.id},
      {...base,type:'receipt',amount:200,is_voided:true,invoice_id:own.id,customer_id:customer.id},
      {...base,type:'payment',amount:7.25,purchase_invoice_id:purchase.id},
      {...base,type:'receipt',amount:0.10,invoice_id:own.id,customer_id:customer.id},
      {...base,type:'receipt',amount:0.20,invoice_id:own.id,customer_id:customer.id},
    ]);
  });
  test('voided documents do not affect totals or running balance',async()=>{
    const r=await get(`?include_summary=true&invoice_id=${own.id}`); expect(r.status).toBe(200);
    expect(r.body.summary.total_receipts).toBe('348.30'); expect(r.body.data[0].running_balance).toBe('348.30');
    const v=await get(`?include_summary=true&invoice_id=${own.id}&is_voided=true`); expect(v.body.pagination.total).toBe(1); expect(v.body.summary.net_balance).toBe('0.00'); expect(v.body.data[0].running_balance).toBe('0.00');
  });
  test('salesperson scope is immutable for totals, rows and customer filters',async()=>{
    const r=await get(`?include_summary=true&salesperson_id=${users.admin.id}&customer_id=${customer.id}`,'salesperson');
    expect(r.status).toBe(200); expect(r.body.summary.total_receipts).toBe('348.30'); expect(r.body.summary.total_payments).toBe('0.00'); expect(r.body.data.every(t=>t.invoice_id===own.id)).toBe(true);
    const hidden=await get(`?include_summary=true&invoice_id=${other.id}`,'salesperson'); expect(hidden.body.data).toEqual([]); expect(hidden.body.summary.net_balance).toBe('0.00');
  });
  test('purchase and type filters include only authorized matching payments',async()=>{
    const r=await get(`?include_summary=true&type=payment&purchase_invoice_id=${purchase.id}`); expect(r.status).toBe(200); expect(r.body.summary).toEqual({total_receipts:'0.00',total_payments:'7.25',net_balance:'-7.25'}); expect(r.body.data[0].running_balance).toBe('-7.25');
    const hidden=await get(`?include_summary=true&purchase_invoice_id=${purchase.id}`,'salesperson'); expect(hidden.body.summary.net_balance).toBe('0.00'); expect(hidden.body.data).toEqual([]);
  });
  test('lower date bound starts running balance inside the selected range',async()=>{
    const r=await get(`?include_summary=true&from=2026-01-03&to=2026-01-03&invoice_id=${own.id}&is_voided=false`);
    expect(r.status).toBe(200); expect(r.body.pagination.total).toBe(2); expect(r.body.summary.total_receipts).toBe('0.30'); expect(r.body.data[0].running_balance).toBe('0.30');
  });
});
test('optional customer access hint matches ownership without exposing credit limit',async()=>{
  const hidden=await Customer.create({full_name:'Unowned customer',phone:'09120000009'});
  const r=await request(app).get('/api/customers?include_financial_access=true').set('Authorization',`Bearer ${tokens.salesperson}`);
  expect(r.status).toBe(200); expect(r.body.data.find(c=>c.id===customer.id).can_view_financials).toBe(true); expect(r.body.data.find(c=>c.id===hidden.id).can_view_financials).toBe(false); expect(r.body.data.every(c=>c.credit_limit===undefined)).toBe(true);
});

// SQLite NUMERIC affinity cannot store this DECIMAL fixture exactly. This test
// must run on explicitly configured, isolated PostgreSQL; never substitute SQLite.
(pg ? test : test.skip)('large PostgreSQL aggregates, negatives and running balances remain exact JSON strings', async () => {
  const largeCustomer = await Customer.create({ full_name: 'Exact totals', phone: '09120000088' });
  const order = await Order.create({ order_number: 'EXACT-LARGE', customer_id: largeCustomer.id,
    salesperson_id: users.salesperson.id, total_amount: '999999999999.99' });
  const invoice = await Invoice.create({ invoice_number: 'EXACT-LARGE', order_id: order.id,
    subtotal: '999999999999.99', total_amount: '999999999999.99' });
  const base = { amount: '999999999999.99', method: 'cash', created_by: users.admin.id,
    transaction_date: new Date('2026-03-01T12:00:00Z') };
  await TreasuryTransaction.bulkCreate(Array.from({ length: 91 }, () => ({ ...base, type: 'receipt',
    customer_id: largeCustomer.id, invoice_id: invoice.id })));
  for (const page of [1, 5]) {
    const r = await get(`?include_summary=true&invoice_id=${invoice.id}&limit=20&page=${page}`);
    expect(r.status).toBe(200);
    expect(r.body.summary).toEqual({ total_receipts: '90999999999999.09', total_payments: '0.00', net_balance: '90999999999999.09' });
    if (page === 1) expect(r.body.data[0].running_balance).toBe('90999999999999.09');
    else expect(r.body.data.at(-1).running_balance).toBe('999999999999.99');
    expect(r.body.data.every(row => typeof row.running_balance === 'string')).toBe(true);
  }
  await TreasuryTransaction.create({ ...base, type: 'receipt', invoice_id: invoice.id,
    customer_id: largeCustomer.id, is_voided: true });
  expect((await get(`?include_summary=true&invoice_id=${invoice.id}`)).body.summary.total_receipts).toBe('90999999999999.09');
  await TreasuryTransaction.bulkCreate(Array.from({ length: 92 }, () => ({ ...base, type: 'payment' })));
  const negative = await get('?include_summary=true&type=payment&from=2026-03-01&to=2026-03-01');
  expect(negative.status).toBe(200);
  expect(negative.body.summary).toEqual({ total_receipts: '0.00', total_payments: '91999999999999.08', net_balance: '-91999999999999.08' });
  expect(negative.body.data[0].running_balance).toBe('-91999999999999.08');
  const mixed = await get('?include_summary=true&from=2026-03-01&to=2026-03-01');
  expect(mixed.body.summary.net_balance).toBe('-999999999999.99');
  const hidden = await get(`?include_summary=true&invoice_id=${invoice.id}`, 'salesperson');
  expect(hidden.body.summary.total_receipts).toBe('90999999999999.09');
  expect(hidden.body.summary.total_payments).toBe('0.00');
});

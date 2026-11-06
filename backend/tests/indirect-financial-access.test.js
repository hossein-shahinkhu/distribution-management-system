process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Order, Invoice, Customer, Distributor, Product, OrderItem, TreasuryTransaction, SalesCreditNote } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
let users = {}, tokens = {}, own, other, unassigned, invoice, otherInvoice, receipt, customer, distributor;
beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || sequelize.getDialect() !== 'sqlite' || sequelize.options.storage !== ':memory:') throw new Error('Isolated SQLite required');
  await sequelize.sync({ force: true }); await seedRoles();
  for (const [key, roleName] of [['admin','admin'], ['a','salesperson'], ['b','salesperson'], ['warehouse','warehouse_keeper'], ['dist','distributor']]) {
    users[key] = await createUser({ roleName, email: `indirect-${key}@example.test` }); tokens[key] = tokenFor(users[key]);
  }
  customer = await Customer.create({ full_name:'Shared', phone:'09120000000', credit_limit:9999 });
  distributor = await Distributor.create({ full_name:'Driver', phone:'09120000001', user_id:users.dist.id, commission_rate:7 });
  const product = await Product.create({ name:'Operational', sku:'INDIRECT', unit_price:100, stock_quantity:20 });
  async function make(name, owner, assigned) {
    const order = await Order.create({ order_number:name, customer_id:customer.id, salesperson_id:owner, distributor_id:assigned, total_amount:100, status:'pending' });
    await OrderItem.create({ order_id:order.id, product_id:product.id, quantity:1, unit_price:100, line_total:100 }); return order;
  }
  own = await make('OWN',users.a.id,distributor.id); other = await make('OTHER',users.b.id,null); unassigned = await make('UNASSIGNED',null,null);
  invoice = await Invoice.create({ invoice_number:'OWN-INV', order_id:own.id, subtotal:100, total_amount:100 });
  otherInvoice = await Invoice.create({ invoice_number:'SECRET-INV', order_id:other.id, subtotal:100, total_amount:100 });
  receipt = await TreasuryTransaction.create({ type:'receipt', amount:30, method:'cash', invoice_id:invoice.id, customer_id:customer.id, created_by:users.admin.id });
  await TreasuryTransaction.create({ type:'receipt', amount:70, method:'cash', invoice_id:otherInvoice.id, customer_id:customer.id, created_by:users.admin.id });
  await TreasuryTransaction.create({ type:'receipt', amount:11, method:'cash', customer_id:customer.id, created_by:users.admin.id });
});
afterAll(() => sequelize.close());
function api(method,path,key,body) { const r = request(app)[method](path).set('Authorization',`Bearer ${tokens[key]}`); return body ? r.send(body) : r; }
function operational(data) {
  expect(data.can_view_financials).toBe(false); expect(data.total_amount).toBeUndefined(); expect(data.Invoice).toBeUndefined();
  expect(data.Customer?.credit_limit).toBeUndefined(); expect(data.Distributor?.commission_rate).toBeUndefined();
  for (const item of data.items || []) { expect(item.unit_price).toBeUndefined(); expect(item.line_total).toBeUndefined(); expect(item.Product?.unit_price).toBeUndefined(); }
}
test('distributor sees assigned operations only, including filtered lists', async () => {
  const assigned = await api('get',`/api/orders/${own.id}`,'dist'); expect(assigned.status).toBe(200); operational(assigned.body);
  expect((await api('get',`/api/orders/${other.id}`,'dist')).status).toBe(403);
  const list = await api('get',`/api/orders?distributor_id=999&include_summary=true`,'dist'); expect(list.body.data.map(o=>o.id)).toEqual([own.id]); operational(list.body.data[0]);
  expect((await api('get','/api/orders?amount_min=1','dist')).status).toBe(403);
});
test('warehouse keeps operational orders without prices or nested documents', async () => {
  const detail = await api('get',`/api/orders/${own.id}`,'warehouse'); expect(detail.status).toBe(200); operational(detail.body);
  const list = await api('get','/api/orders','warehouse'); expect(list.body.data).toHaveLength(3); list.body.data.forEach(operational);
});
test('salesperson financial ownership does not extend to shared-customer or unassigned orders', async () => {
  const detail = await api('get',`/api/orders/${own.id}`,'a'); expect(detail.body.Invoice.invoice_number).toBe('OWN-INV'); expect(detail.body.total_amount).toBe(100);
  for (const order of [other,unassigned]) operational((await api('get',`/api/orders/${order.id}`,'a')).body);
  const list = await api('get',`/api/orders?amount_min=1&salesperson_id=${users.b.id}`,'a'); expect(list.body.data.map(o=>o.id)).toEqual([own.id]);
});
test.each(['dist','warehouse'])('%s cannot access treasury, statements, or financial reports', async role => {
  for (const path of ['/api/treasury',`/api/customers/${customer.id}/statement`,`/api/customers/${customer.id}/credit-usage`,'/api/reports/sales','/api/reports/overview','/api/reports/treasury-balance']) {
    const r = await api('get',path,role); expect(r.status).toBe(403); expect(Object.keys(r.body)).toEqual(['message']);
  }
});
test('treasury queries and counts remain limited to own invoices', async () => {
  const list = await api('get',`/api/treasury?customer_id=${customer.id}&salesperson_id=${users.b.id}`,'a'); expect(list.status).toBe(200); expect(list.body.data.map(r=>r.id)).toEqual([receipt.id]); expect(list.body.pagination.total).toBe(1);
  const hidden = await api('get',`/api/treasury?invoice_id=${otherInvoice.id}`,'a'); expect(hidden.body.data).toEqual([]); expect(hidden.body.pagination.total).toBe(0);
});
test('statement and balances include only owned-order receipts once', async () => {
  const statement = await api('get',`/api/customers/${customer.id}/statement?salesperson_id=${users.b.id}`,'a'); expect(statement.body.scope).toBe('salesperson_orders'); expect(statement.body.closing_balance).toBe(70); expect(statement.body.entries).toHaveLength(2); expect(JSON.stringify(statement.body)).not.toContain('SECRET-INV');
  const usage = await api('get',`/api/customers/${customer.id}/credit-usage`,'a'); expect(usage.body.account_balance).toBe(70); expect(usage.body.available_credit).toBeNull();
  expect((await api('get',`/api/customers/${customer.id}/statement`,'admin')).body.closing_balance).toBe(89);
});
test('customer without an owned order and missing customer return the same error', async () => {
  const hidden = await Customer.create({ full_name:'Hidden', phone:'09120000009' });
  for(const suffix of ['statement','credit-usage']) {
    const a = await api('get',`/api/customers/${hidden.id}/${suffix}`,'a'); const b = await api('get',`/api/customers/999999/${suffix}`,'a'); expect(a.status).toBe(404); expect(a.body).toEqual(b.body);
  }
});
test('sales report ignores forged owner filters', async () => {
  const report = await api('get',`/api/reports/sales?salesperson_id=${users.b.id}`,'a'); expect(report.body.totalOrders).toBe(1); expect(report.body.totalRevenue).toBe(100);
  expect((await api('get','/api/reports/sales','admin')).body.totalOrders).toBe(3);
});
test('invoice issuance rejects unowned and unassigned IDs without creating documents', async () => {
  const before = await Invoice.count();
  for (const order of [other,unassigned]) { const r = await api('post','/api/invoices','a',{order_id:order.id}); expect(r.status).toBe(404); expect(Object.keys(r.body)).toEqual(['message']); }
  expect(await Invoice.count()).toBe(before);
  expect((await api('post','/api/invoices','admin',{order_id:unassigned.id})).status).toBe(201);
});
test('receipt and void authorization do not modify another owners financial records', async () => {
  const before = await TreasuryTransaction.count();
  const r = await api('post','/api/treasury','a',{type:'receipt',method:'cash',amount:5,invoice_id:otherInvoice.id}); expect(r.status).toBe(404); expect(await TreasuryTransaction.count()).toBe(before);
  expect((await api('patch',`/api/treasury/${receipt.id}/void`,'b')).status).toBe(404); expect((await receipt.reload()).is_voided).toBe(false);
});
test('salesperson cannot create or void unlinked treasury documents; administrator retains access', async () => {
  for(const type of ['receipt','payment']) expect((await api('post','/api/treasury','a',{type,method:'cash',amount:5})).status).toBe(403);
  const unlinked = await TreasuryTransaction.findOne({where:{invoice_id:null}});
  expect((await api('patch',`/api/treasury/${unlinked.id}/void`,'a')).status).toBe(404);
  expect((await api('post','/api/treasury','admin',{type:'payment',method:'cash',amount:5})).status).toBe(201);
});
test('authorized own receipt supports partial payment and reversal', async () => {
  const r = await api('post','/api/treasury','a',{type:'receipt',method:'cash',amount:10,invoice_id:invoice.id}); expect(r.status).toBe(201);
  expect((await api('patch',`/api/treasury/${r.body.id}/void`,'a')).status).toBe(200);
  expect((await api('get',`/api/customers/${customer.id}/credit-usage`,'a')).body.account_balance).toBe(70);
});
test('warehouse status changes preserve operations and redact financial fields', async () => {
  const r = await api('patch',`/api/orders/${own.id}/status`,'warehouse',{status:'confirmed'});
  expect(r.status).toBe(200); expect(r.body.status).toBe('confirmed'); operational(r.body);
});
test('owned credit notes are included once; another salespersons credits remain private', async () => {
  for (const [order, inv, number] of [[own,invoice,'OWN-CREDIT'],[other,otherInvoice,'SECRET-CREDIT']]) {
    await SalesCreditNote.create({credit_number:number,invoice_id:inv.id,order_id:order.id,customer_id:customer.id,subtotal:100,tax_amount:0,total_amount:100,confirmed_not_dispatched:true,created_by:users.admin.id});
  }
  const r = await api('get',`/api/customers/${customer.id}/statement`,'a');
  expect(r.body.closing_balance).toBe(-30); expect(r.body.entries.filter(e=>e.type==='sales_credit_note')).toHaveLength(1);
  expect(JSON.stringify(r.body)).not.toContain('SECRET-CREDIT');
  const usage = await api('get',`/api/customers/${customer.id}/credit-usage`,'a'); expect(usage.body.credit_balance).toBe(30); expect(usage.body.outstanding_balance).toBe(0);
});
test('invoice issuance and quote conversion enforce ownership and retain authorized flow', async () => {
  const quote = await Order.create({order_number:'OWN-QUOTE',customer_id:customer.id,salesperson_id:users.a.id,total_amount:0,status:'quote',is_quote:true});
  expect((await api('post',`/api/orders/${quote.id}/convert-to-order`,'b',{})).status).toBe(404);
  expect((await quote.reload()).is_quote).toBe(true);
  expect((await api('post',`/api/orders/${quote.id}/convert-to-order`,'a',{})).status).toBe(200);
  expect((await api('post','/api/invoices','a',{order_id:quote.id})).status).toBe(201);
});
test('order read failures do not expose database or financial details', async () => {
  const spy = jest.spyOn(Order,'findByPk').mockRejectedValueOnce(new Error('SECRET-INV SQL total_amount=12345'));
  try {
    const r = await api('get',`/api/orders/${own.id}`,'warehouse');
    expect(r.status).toBe(500); expect(Object.keys(r.body)).toEqual(['message']); expect(JSON.stringify(r.body)).not.toContain('SECRET');
  } finally { spy.mockRestore(); }
});
test('customer and distributor master-data reads do not leak credit or commission', async () => {
  for (const role of ['a','warehouse','dist']) {
    expect((await api('get',`/api/customers/${customer.id}`,role)).body.credit_limit).toBeUndefined();
    const list = await api('get','/api/distributors',role); expect(list.body[0].commission_rate).toBeUndefined();
  }
  expect((await api('get',`/api/customers/${customer.id}`,'admin')).body.credit_limit).toBe(9999);
});

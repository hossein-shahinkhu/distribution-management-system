process.env.JWT_SECRET = 'test_secret';
const request = require('supertest');
const app = require('../src/app');
const { sequelize, Customer } = require('../src/models');
const { seedRoles, createUser, tokenFor } = require('./testUtils');
const tokens = {};
let customer;
beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || sequelize.getDialect() !== 'sqlite' || sequelize.options.storage !== ':memory:') throw new Error('Isolated in-memory database required');
  await sequelize.sync({ force: true }); await seedRoles();
  for (const roleName of ['admin', 'salesperson', 'warehouse_keeper', 'distributor']) {
    tokens[roleName] = tokenFor(await createUser({ roleName, email: `credit-permission-${roleName}@example.test` }));
  }
  customer = await Customer.create({ full_name: 'Original', phone: '09120000000', credit_limit: '1234.50' });
});
afterAll(() => sequelize.close());
function api(method, path, role, body) {
  const req = request(app)[method](path).set('Authorization', `Bearer ${tokens[role]}`);
  return body ? req.send(body) : req;
}
test('admin can create and update the credit limit with fractional precision', async () => {
  const created = await api('post','/api/customers','admin',{full_name:'Admin created',phone:'09120000001',credit_limit:'1500.25'});
  expect(created.status).toBe(201); expect(Number(created.body.credit_limit)).toBe(1500.25);
  const updated = await api('put',`/api/customers/${created.body.id}`,'admin',{credit_limit:'2500.75'});
  expect(updated.status).toBe(200); expect(Number((await Customer.findByPk(created.body.id)).credit_limit)).toBe(2500.75);
});
test.each(['salesperson','warehouse_keeper','distributor'])('%s cannot create or update credit', async role => {
  const before = await Customer.count();
  const created = await api('post','/api/customers',role,{full_name:'Forbidden',phone:'09120000002',credit_limit:999});
  expect(created.status).toBe(403); expect(await Customer.count()).toBe(before);
  const updated = await api('put',`/api/customers/${customer.id}`,role,{full_name:'Changed',credit_limit:999});
  expect(updated.status).toBe(403);
  const actual = await customer.reload(); expect(actual.full_name).toBe('Original'); expect(Number(actual.credit_limit)).toBe(1234.5);
  expect(JSON.stringify(updated.body)).not.toContain('1234'); expect(updated.body.credit_limit).toBeUndefined();
});
test.each([0,null,'1234.50','invalid',{},[]].map(value => [value]))('salesperson credit field presence is rejected even for %j', async credit_limit => {
  const r = await api('put',`/api/customers/${customer.id}`,'salesperson',{city:'Forbidden city',credit_limit});
  expect(r.status).toBe(403); expect(r.body.code).toBe('CUSTOMER_CREDIT_ADMIN_ONLY');
  await customer.reload(); expect(customer.city).toBeNull(); expect(Number(customer.credit_limit)).toBe(1234.5);
});
test('unauthorized creation is rejected before field validation and creates no record', async () => {
  const before = await Customer.count();
  const r = await api('post','/api/customers','salesperson',{credit_limit:null});
  expect(r.status).toBe(403); expect(r.body.code).toBe('CUSTOMER_CREDIT_ADMIN_ONLY'); expect(await Customer.count()).toBe(before);
});
test('salesperson creates a customer without setting credit; default remains zero and is not disclosed', async () => {
  const r = await api('post','/api/customers','salesperson',{full_name:'Allowed',phone:'09120000003'});
  expect(r.status).toBe(201); expect(r.body.credit_limit).toBeUndefined();
  expect(Number((await Customer.findByPk(r.body.id)).credit_limit)).toBe(0);
});
test('salesperson edits ordinary fields without changing or disclosing existing credit', async () => {
  const r = await api('put',`/api/customers/${customer.id}`,'salesperson',{business_name:'Allowed business',city:'Allowed city'});
  expect(r.status).toBe(200); expect(r.body.business_name).toBe('Allowed business'); expect(r.body.credit_limit).toBeUndefined();
  await customer.reload(); expect(Number(customer.credit_limit)).toBe(1234.5); expect(customer.city).toBe('Allowed city');
});
test.each(['salesperson','warehouse_keeper','distributor'])('%s cannot read credit in customer list or detail', async role => {
  const one = await api('get',`/api/customers/${customer.id}`,role); expect(one.status).toBe(200); expect(one.body.credit_limit).toBeUndefined();
  const list = await api('get','/api/customers',role); expect(list.status).toBe(200); expect(list.body.data.every(c=>!Object.prototype.hasOwnProperty.call(c,'credit_limit'))).toBe(true);
});
test('query role cannot bypass body credit permission', async () => {
  const r = await api('put',`/api/customers/${customer.id}?role=admin&credit_limit=0`,'salesperson',{credit_limit:0});
  expect(r.status).toBe(403); expect(Number((await customer.reload()).credit_limit)).toBe(1234.5);
});

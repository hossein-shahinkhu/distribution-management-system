const { Role, User } = require('../src/models');

const ROLE_NAMES = ['admin', 'warehouse_keeper', 'salesperson', 'distributor'];

async function seedRoles() {
  const roles = {};
  for (const name of ROLE_NAMES) {
    const [role] = await Role.findOrCreate({ where: { name }, defaults: { name } });
    roles[name] = role;
  }
  return roles;
}

async function createUser({ roleName = 'admin', email, password = 'Test@1234', full_name = 'کاربر آزمایشی' }) {
  const role = await Role.findOne({ where: { name: roleName } });
  return User.create({
    full_name,
    email,
    password_hash: password,
    role_id: role.id,
  });
}

module.exports = { seedRoles, createUser, ROLE_NAMES };

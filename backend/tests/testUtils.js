const { Role, User } = require('../src/models');
const { generateToken } = require('../src/utils/token');

const ROLE_NAMES = ['admin', 'warehouse_keeper', 'salesperson', 'distributor'];

async function seedRoles() {
  const roles = {};
  for (const name of ROLE_NAMES) {
    const [role] = await Role.findOrCreate({ where: { name }, defaults: { name } });
    roles[name] = role;
  }
  return roles;
}

/**
 * Creates a User record and returns the Sequelize instance.
 * The `roleName` is stored as `user.__roleName` so that `tokenFor()`
 * can embed the correct claim without an extra DB query.
 */
async function createUser({ roleName = 'admin', email, password = 'Test@1234', full_name = 'کاربر آزمایشی' }) {
  const role = await Role.findOne({ where: { name: roleName } });
  const user = await User.create({
    full_name,
    email,
    password_hash: password,
    role_id: role.id,
  });
  // Attach the role name so test helpers can build a correctly-signed token
  user.__roleName = roleName;
  return user;
}

/**
 * Generates a JWT for the given user with the correct `role_name` claim.
 * Use this in tests instead of calling `generateToken(user)` directly,
 * since the S-06 change requires the role name to be passed explicitly.
 *
 * @param {object} user      — Sequelize User instance returned by createUser()
 * @param {string} [roleName] — Override the role name (defaults to user.__roleName)
 * @returns {string}          — Signed JWT
 */
function tokenFor(user, roleName) {
  return generateToken(user, roleName ?? user.__roleName ?? 'admin');
}

module.exports = { seedRoles, createUser, tokenFor, ROLE_NAMES };

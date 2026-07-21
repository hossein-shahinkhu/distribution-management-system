const jwt = require('jsonwebtoken');

/**
 * S-06: Include role_name in the JWT payload so that the auth middleware
 * can skip a DB query on every request for role-based authorization checks.
 *
 * The DB query in authenticate() is still done to verify the user is still
 * active and exists — but the Role association is no longer needed there.
 *
 * @param {object} user      — Sequelize User instance
 * @param {string} roleName  — Role name string (e.g. 'admin', 'salesperson')
 * @returns {string}         — Signed JWT
 */
function generateToken(user, roleName) {
  return jwt.sign(
    {
      id:        user.id,
      role_id:   user.role_id,
      role_name: roleName,           // ← new: avoids extra join in middleware
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

module.exports = { generateToken };

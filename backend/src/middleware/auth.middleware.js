const jwt       = require('jsonwebtoken');
const { User, Role } = require('../models');

/**
 * authenticate — verifies the Bearer token and loads the user record.
 *
 * S-06 optimization: role_name is now embedded in the JWT payload, so we
 * no longer need to JOIN the Role table on every request.  The User.findByPk
 * call (without include) is still necessary to confirm the account is still
 * active and has not been deleted.
 *
 * We synthesise a minimal req.user.Role object from the JWT claim so that
 * all downstream authorize() calls and controller checks (req.user.Role.name)
 * continue to work without any changes.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'توکن احراز هویت ارسال نشده است.' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch only the user row — no JOIN needed (role_name lives in the token)
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'کاربر معتبر نیست یا غیرفعال شده است.' });
    }

    // Attach a synthetic Role object from the JWT payload
    user.Role = { name: decoded.role_name };
    req.user  = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'توکن نامعتبر یا منقضی شده است.' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.Role) {
      return res.status(403).json({ message: 'دسترسی غیرمجاز.' });
    }
    if (!allowedRoles.includes(req.user.Role.name)) {
      return res.status(403).json({ message: 'شما مجوز انجام این عملیات را ندارید.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };

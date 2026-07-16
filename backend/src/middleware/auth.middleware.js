const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'توکن احراز هویت ارسال نشده است.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, { include: Role });
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'کاربر معتبر نیست یا غیرفعال شده است.' });
    }

    req.user = user;
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

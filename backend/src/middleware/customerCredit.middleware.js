'use strict';

// Presence matters: zero, null and unchanged values still require permission.
// Run before validation and persistence so mixed requests fail as a whole.
function protectCustomerCredit(req, res, next) {
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'credit_limit') && req.user?.Role?.name !== 'admin') {
    return res.status(403).json({
      code: 'CUSTOMER_CREDIT_ADMIN_ONLY',
      message: 'تنظیم یا تغییر سقف اعتبار مشتری فقط برای مدیر مجاز است.',
    });
  }
  return next();
}

module.exports = protectCustomerCredit;

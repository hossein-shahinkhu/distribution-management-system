const { body } = require('express-validator');

const updateUserRules = [
  body('full_name').optional().trim().notEmpty().withMessage('نام کامل نمی‌تواند خالی باشد.'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('is_active').optional().isBoolean().withMessage('مقدار فعال/غیرفعال باید boolean باشد.'),
  body('commission_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('نرخ پورسانت باید عددی بین ۰ و ۱۰۰ باشد.'),
  body('role_name')
    .optional()
    .isIn(['admin', 'warehouse_keeper', 'salesperson', 'distributor'])
    .withMessage('نقش انتخاب‌شده معتبر نیست.'),
];

module.exports = { updateUserRules };

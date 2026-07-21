const { body } = require('express-validator');

const createSupplierRules = [
  body('name').trim().notEmpty().withMessage('نام تامین‌کننده الزامی است.'),
  body('phone')
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('payment_terms_days')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('مهلت پرداخت باید عدد صحیح غیرمنفی باشد.'),
];

const updateSupplierRules = [
  body('name').optional().trim().notEmpty().withMessage('نام تامین‌کننده نمی‌تواند خالی باشد.'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('payment_terms_days')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('مهلت پرداخت باید عدد صحیح غیرمنفی باشد.'),
];

module.exports = { createSupplierRules, updateSupplierRules };

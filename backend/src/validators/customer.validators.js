const { body } = require('express-validator');

const createCustomerRules = [
  body('full_name').trim().notEmpty().withMessage('نام مشتری الزامی است.'),
  body('phone')
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('سقف اعتبار باید عددی غیرمنفی باشد.'),
  body('route_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('مسیر نامعتبر است.'),
];

const updateCustomerRules = [
  body('full_name').optional().trim().notEmpty().withMessage('نام مشتری نمی‌تواند خالی باشد.'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('سقف اعتبار باید عددی غیرمنفی باشد.'),
  body('route_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('مسیر نامعتبر است.'),
];

module.exports = { createCustomerRules, updateCustomerRules };

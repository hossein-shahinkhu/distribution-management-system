const { body } = require('express-validator');

const createCustomerRules = [
  body('full_name').trim().notEmpty().withMessage('نام مشتری الزامی است.'),
  body('phone')
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('سقف اعتبار باید عددی غیرمنفی باشد.'),
];

module.exports = { createCustomerRules };

const { body } = require('express-validator');

const createInvoiceRules = [
  body('order_id').isInt({ min: 1 }).withMessage('شناسه سفارش معتبر نیست.'),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('درصد مالیات باید بین ۰ تا ۱۰۰ باشد.'),
];

const updatePaymentStatusRules = [
  body('payment_status')
    .isIn(['unpaid', 'partial', 'paid'])
    .withMessage('وضعیت پرداخت باید یکی از مقادیر unpaid، partial یا paid باشد.'),
];

module.exports = { createInvoiceRules, updatePaymentStatusRules };

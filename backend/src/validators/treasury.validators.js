const { body } = require('express-validator');

const createTreasuryTransactionRules = [
  body('type').isIn(['receipt', 'payment']).withMessage('نوع تراکنش باید دریافت یا پرداخت باشد.'),
  body('amount').isFloat({ gt: 0 }).withMessage('مبلغ باید عددی مثبت باشد.'),
  body('method')
    .isIn(['cash', 'bank_transfer', 'card', 'cheque'])
    .withMessage('روش تراکنش نامعتبر است.'),
  body('reference_number').optional({ nullable: true }).isString(),
  body('transaction_date').optional({ nullable: true }).isISO8601().withMessage('تاریخ تراکنش نامعتبر است.'),
  body('description').optional({ nullable: true }).isString(),
  body('customer_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('مشتری انتخاب‌شده معتبر نیست.'),
  body('invoice_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('فاکتور انتخاب‌شده معتبر نیست.'),
  body('purchase_invoice_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('فاکتور خرید انتخاب‌شده معتبر نیست.'),
];

module.exports = { createTreasuryTransactionRules };

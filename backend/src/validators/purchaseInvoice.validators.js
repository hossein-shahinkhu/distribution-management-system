const { body } = require('express-validator');

const createPurchaseInvoiceRules = [
  body('invoice_number').trim().notEmpty().withMessage('شماره فاکتور تامین‌کننده الزامی است.'),
  body('purchase_order_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('سفارش خرید انتخاب‌شده معتبر نیست.'),
  body('supplier_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('تامین‌کننده انتخاب‌شده معتبر نیست.'),
  body('subtotal').isFloat({ min: 0 }).withMessage('جمع جزء باید عددی غیرمنفی باشد.'),
  body('tax_amount').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('مالیات باید عددی غیرمنفی باشد.'),
  body('total_amount').isFloat({ gt: 0 }).withMessage('مبلغ کل باید عددی مثبت باشد.'),
];

module.exports = { createPurchaseInvoiceRules };

const { body } = require('express-validator');

const VALID_PURCHASE_STATUSES = ['ordered', 'received', 'cancelled'];

const createPurchaseOrderRules = [
  body('supplier_id').isInt({ min: 1 }).withMessage('تامین‌کننده معتبر انتخاب کنید.'),
  body('items').isArray({ min: 1 }).withMessage('حداقل یک قلم کالا باید در سفارش خرید باشد.'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('کالای انتخاب‌شده معتبر نیست.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('تعداد باید عدد صحیح مثبت باشد.'),
  body('items.*.unit_cost').isFloat({ gt: 0 }).withMessage('قیمت خرید واحد باید عددی مثبت باشد.'),
];

const updatePurchaseOrderStatusRules = [
  body('status')
    .isIn(VALID_PURCHASE_STATUSES)
    .withMessage('وضعیت انتخاب‌شده برای سفارش خرید معتبر نیست.'),
];

module.exports = { createPurchaseOrderRules, updatePurchaseOrderStatusRules };

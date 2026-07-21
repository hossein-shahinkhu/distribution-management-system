const { body } = require('express-validator');

const VALID_SALES_STATUSES = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];

const createOrderRules = [
  body('customer_id').isInt({ min: 1 }).withMessage('مشتری معتبر انتخاب کنید.'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('حداقل یک قلم کالا باید در سفارش باشد.'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('کالای انتخاب‌شده معتبر نیست.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('تعداد باید عدد صحیح مثبت باشد.'),
  body('is_quote').optional().isBoolean().withMessage('is_quote باید مقدار boolean باشد.'),
];

const updateStatusRules = [
  body('status')
    .isIn(VALID_SALES_STATUSES)
    .withMessage('وضعیت انتخاب‌شده معتبر نیست.'),
];

module.exports = { createOrderRules, updateStatusRules };

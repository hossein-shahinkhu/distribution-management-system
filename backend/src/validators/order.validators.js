const { body } = require('express-validator');

const createOrderRules = [
  body('customer_id').isInt({ min: 1 }).withMessage('مشتری معتبر انتخاب کنید.'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('حداقل یک قلم کالا باید در سفارش باشد.'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('کالای انتخاب‌شده معتبر نیست.'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('تعداد باید عدد صحیح مثبت باشد.'),
];

module.exports = { createOrderRules };

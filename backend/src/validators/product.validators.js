const { body } = require('express-validator');

const createProductRules = [
  body('sku').trim().notEmpty().withMessage('کد کالا (SKU) الزامی است.'),
  body('name').trim().notEmpty().withMessage('نام کالا الزامی است.'),
  body('unit_price')
    .isFloat({ min: 0 })
    .withMessage('قیمت واحد باید عددی مثبت باشد.'),
  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('موجودی باید عدد صحیح غیرمنفی باشد.'),
  body('reorder_level')
    .optional()
    .isInt({ min: 0 })
    .withMessage('آستانه سفارش مجدد باید عدد صحیح غیرمنفی باشد.'),
  body('category_id').optional({ nullable: true }).isInt().withMessage('دسته‌بندی نامعتبر است.'),
];

const updateProductRules = [
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('قیمت واحد باید عددی مثبت باشد.'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('موجودی باید عدد صحیح غیرمنفی باشد.'),
  body('reorder_level').optional().isInt({ min: 0 }).withMessage('آستانه سفارش مجدد باید عدد صحیح غیرمنفی باشد.'),
];

module.exports = { createProductRules, updateProductRules };

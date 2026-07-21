const { body } = require('express-validator');

const createDistributorRules = [
  body('full_name').trim().notEmpty().withMessage('نام توزیع‌کننده الزامی است.'),
  body('phone')
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('commission_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('نرخ پورسانت باید عددی بین ۰ و ۱۰۰ باشد.'),
  body('user_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('شناسه کاربر نامعتبر است.'),
];

const updateDistributorRules = [
  body('full_name').optional().trim().notEmpty().withMessage('نام توزیع‌کننده نمی‌تواند خالی باشد.'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s]{8,15}$/)
    .withMessage('شماره تماس معتبر وارد کنید.'),
  body('commission_rate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('نرخ پورسانت باید عددی بین ۰ و ۱۰۰ باشد.'),
  body('user_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('شناسه کاربر نامعتبر است.'),
];

module.exports = { createDistributorRules, updateDistributorRules };

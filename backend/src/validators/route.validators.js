const { body } = require('express-validator');

const createRouteRules = [
  body('name').trim().notEmpty().withMessage('نام مسیر الزامی است.'),
  body('description').optional().trim(),
];

const updateRouteRules = [
  body('name').optional().trim().notEmpty().withMessage('نام مسیر نمی‌تواند خالی باشد.'),
  body('description').optional().trim(),
];

module.exports = { createRouteRules, updateRouteRules };

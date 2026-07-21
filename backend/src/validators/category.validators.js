const { body } = require('express-validator');

const createCategoryRules = [
  body('name').trim().notEmpty().withMessage('نام دسته‌بندی الزامی است.'),
  body('description').optional({ nullable: true }).trim(),
];

module.exports = { createCategoryRules };

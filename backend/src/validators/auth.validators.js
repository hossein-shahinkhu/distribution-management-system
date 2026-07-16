const { body } = require('express-validator');

const loginRules = [
  body('email').isEmail().withMessage('ایمیل معتبر وارد کنید.'),
  body('password').notEmpty().withMessage('رمز عبور الزامی است.'),
];

const registerRules = [
  body('full_name').trim().notEmpty().withMessage('نام کامل الزامی است.'),
  body('email').isEmail().withMessage('ایمیل معتبر وارد کنید.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('رمز عبور باید حداقل ۸ کاراکتر باشد.'),
  body('role_name')
    .isIn(['admin', 'warehouse_keeper', 'salesperson', 'distributor'])
    .withMessage('نقش انتخاب‌شده معتبر نیست.'),
];

const changePasswordRules = [
  body('current_password').notEmpty().withMessage('رمز عبور فعلی الزامی است.'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('رمز عبور جدید باید حداقل ۸ کاراکتر باشد.'),
];

module.exports = { loginRules, registerRules, changePasswordRules };

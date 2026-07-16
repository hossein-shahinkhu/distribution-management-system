const express = require('express');
const router = express.Router();
const { register, login, me, listUsers, changePassword, updateUser } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { loginRules, registerRules, changePasswordRules } = require('../validators/auth.validators');

router.post('/login', authLimiter, loginRules, validate, login);
// ثبت‌نام کاربر جدید فقط توسط ادمین مجاز است
router.post('/register', authenticate, authorize('admin'), registerRules, validate, register);
router.get('/me', authenticate, me);
router.get('/users', authenticate, authorize('admin'), listUsers);
router.patch('/users/:id', authenticate, authorize('admin'), updateUser);
router.patch('/change-password', authenticate, changePasswordRules, validate, changePassword);

module.exports = router;

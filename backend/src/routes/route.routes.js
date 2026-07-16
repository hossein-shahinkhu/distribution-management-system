const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/route.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// مشاهده لیست مسیرها برای همه کاربران احراز هویت‌شده آزاد است (برای فیلترها)
// اما مدیریت (ایجاد/ویرایش/حذف) فقط برای admin مجاز است
router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin'), ctrl.create);
router.put('/:id', authenticate, authorize('admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;

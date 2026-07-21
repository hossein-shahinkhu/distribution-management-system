const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createCategoryRules } = require('../validators/category.validators');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, authorize('admin', 'warehouse_keeper'), createCategoryRules, validate, ctrl.create);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supplier.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createSupplierRules, updateSupplierRules } = require('../validators/supplier.validators');

router.get('/', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.getAll);
router.get('/:id', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'warehouse_keeper'), createSupplierRules, validate, ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'warehouse_keeper'), updateSupplierRules, validate, ctrl.update);
router.delete('/:id', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.remove);

module.exports = router;

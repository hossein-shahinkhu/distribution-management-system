const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/purchaseOrder.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createPurchaseOrderRules } = require('../validators/purchaseOrder.validators');

router.get('/', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.getAll);
router.get('/:id', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'warehouse_keeper'), createPurchaseOrderRules, validate, ctrl.create);
router.patch('/:id/status', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.updateStatus);

module.exports = router;

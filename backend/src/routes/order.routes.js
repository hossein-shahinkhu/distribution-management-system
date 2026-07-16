const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createOrderRules } = require('../validators/order.validators');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'salesperson'), createOrderRules, validate, ctrl.create);
router.patch('/:id/status', authenticate, authorize('admin', 'warehouse_keeper', 'distributor'), ctrl.updateStatus);
router.patch('/:id/assign-distributor', authenticate, authorize('admin'), ctrl.assignDistributor);

module.exports = router;

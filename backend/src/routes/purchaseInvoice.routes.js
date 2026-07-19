const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/purchaseInvoice.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createPurchaseInvoiceRules } = require('../validators/purchaseInvoice.validators');

router.get('/', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.getAll);
router.get('/:id', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'warehouse_keeper'), createPurchaseInvoiceRules, validate, ctrl.create);

module.exports = router;

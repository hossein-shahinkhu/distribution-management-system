const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createInvoiceRules } = require('../validators/invoice.validators');

router.get('/', authenticate, authorize('admin', 'salesperson'), ctrl.getAll);
router.get('/:id', authenticate, authorize('admin', 'salesperson'), ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'salesperson'), createInvoiceRules, validate, ctrl.createFromOrder);
router.patch('/:id/payment-status', authenticate, authorize('admin'), ctrl.updatePaymentStatus);

module.exports = router;

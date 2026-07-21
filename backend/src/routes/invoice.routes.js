const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createInvoiceRules, updatePaymentStatusRules } = require('../validators/invoice.validators');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'salesperson'), createInvoiceRules, validate, ctrl.createFromOrder);
router.patch('/:id/payment-status', authenticate, authorize('admin'), updatePaymentStatusRules, validate, ctrl.updatePaymentStatus);

module.exports = router;

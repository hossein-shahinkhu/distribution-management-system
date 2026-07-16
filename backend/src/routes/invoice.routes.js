const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoice.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'salesperson'), ctrl.createFromOrder);
router.patch('/:id/payment-status', authenticate, authorize('admin'), ctrl.updatePaymentStatus);

module.exports = router;

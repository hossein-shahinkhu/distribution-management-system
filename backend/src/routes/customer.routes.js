const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createCustomerRules } = require('../validators/customer.validators');
const protectCustomerCredit = require('../middleware/customerCredit.middleware');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.get('/:id/credit-usage', authenticate, authorize('admin', 'salesperson'), ctrl.getCreditUsage);
router.get('/:id/statement', authenticate, authorize('admin', 'salesperson'), ctrl.getStatement);
router.post('/', authenticate, authorize('admin', 'salesperson'), protectCustomerCredit, createCustomerRules, validate, ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'salesperson'), protectCustomerCredit, ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;

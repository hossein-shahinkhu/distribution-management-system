const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/treasury.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createTreasuryTransactionRules } = require('../validators/treasury.validators');

router.get('/', authenticate, authorize('admin', 'salesperson'), ctrl.getAll);
router.post('/', authenticate, authorize('admin', 'salesperson'), createTreasuryTransactionRules, validate, ctrl.create);
router.patch('/:id/void', authenticate, authorize('admin', 'salesperson'), ctrl.voidTransaction);

module.exports = router;

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/distributor.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createDistributorRules, updateDistributorRules } = require('../validators/distributor.validators');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, authorize('admin'), createDistributorRules, validate, ctrl.create);
router.put('/:id', authenticate, authorize('admin'), updateDistributorRules, validate, ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;

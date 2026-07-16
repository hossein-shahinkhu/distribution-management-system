const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createProductRules, updateProductRules } = require('../validators/product.validators');

router.get('/low-stock', authenticate, ctrl.lowStock);
router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'warehouse_keeper'), createProductRules, validate, ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'warehouse_keeper'), updateProductRules, validate, ctrl.update);
router.delete('/:id', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.remove);

module.exports = router;

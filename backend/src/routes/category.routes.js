const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.create);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;

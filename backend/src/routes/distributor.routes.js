const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/distributor.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, authorize('admin'), ctrl.create);
router.put('/:id', authenticate, authorize('admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;

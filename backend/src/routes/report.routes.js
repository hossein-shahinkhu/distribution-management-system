const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.get('/sales', authenticate, authorize('admin', 'salesperson'), ctrl.salesReport);
router.get('/inventory', authenticate, authorize('admin', 'warehouse_keeper'), ctrl.inventoryReport);
router.get('/distributor-performance', authenticate, authorize('admin'), ctrl.distributorPerformanceReport);
router.get('/commissions', authenticate, authorize('admin'), ctrl.commissionsReport);
router.get('/treasury-balance', authenticate, authorize('admin'), ctrl.treasuryBalanceReport);

module.exports = router;

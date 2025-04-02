const express = require('express');
const router = express.Router();
const {
  getDailyTransactions,
  getStockMovement,
  getInventoryStats,
  getTransactionHistory
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// All report routes require authentication
router.use(protect);

// Daily reports
router.get('/daily', getDailyTransactions);

// Stock movement report (for chart)
router.get('/stock-movement', getStockMovement);

// Inventory statistics
router.get('/inventory-stats', getInventoryStats);

// Transaction history
router.get('/transactions', getTransactionHistory);

module.exports = router;
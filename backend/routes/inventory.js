const express = require('express');
const router = express.Router();
const {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  processTransaction
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');

// All inventory routes require authentication
router.use(protect);

// Base inventory routes
router.route('/')
  .get(getInventoryItems)
  .post(createInventoryItem);

// Process stock in/out transaction
router.post('/transaction', processTransaction);

// Individual item operations
router.route('/:id')
  .get(getInventoryItem)
  .put(updateInventoryItem)
  .delete(authorize('admin', 'manager'), deleteInventoryItem);

module.exports = router;
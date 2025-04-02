const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  partsName: {
    type: String,
    required: true
  },
  partsNumber: {
    type: String,
    required: true
  },
  transactionType: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'Please add a quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
TransactionSchema.index({ performedAt: -1 });
TransactionSchema.index({ itemId: 1, performedAt: -1 });

// Export the model directly - don't try to re-register InventoryItem
module.exports = mongoose.model('Transaction', TransactionSchema);
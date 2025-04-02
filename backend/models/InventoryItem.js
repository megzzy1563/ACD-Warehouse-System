const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
  partsName: {
    type: String,
    required: [true, 'Please add a parts name'],
    trim: true
  },
  partsNumber: {
    type: String,
    required: [true, 'Please add a parts number'],
    trim: true,
    unique: true
  },
  component: {
    type: String,
    required: [true, 'Please specify the component type'],
    enum: ['Engine', 'Hydraulic', 'Electrical', 'Mechanical', 'Body']
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [0, 'Quantity cannot be negative']
  },
  itemPrice: {
    type: Number,
    required: [true, 'Please add item price'],
    min: [0, 'Price cannot be negative']
  },
  imageData: {
    type: String, // Base64 encoded string
    default: null
  },
  rack: {
    type: String,
    required: [true, 'Please specify rack location']
  },
  tax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please add total amount']
  },
  pic: {
    type: String,
    required: [true, 'Please add PIC']
  },
  poNumber: {
    type: String,
    required: [true, 'Please add PO number']
  },
  ctplNumber: {
    type: String,
    required: [true, 'Please add CTPL number']
  },
  date: {
    type: String,
    required: [true, 'Please add date']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create inventory item number index
InventoryItemSchema.index({ partsNumber: 1 });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
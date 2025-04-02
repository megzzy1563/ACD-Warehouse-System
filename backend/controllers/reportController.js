const Transaction = require('../models/Transaction');
const InventoryItem = require('../models/InventoryItem');
const mongoose = require('mongoose');

/**
 * @desc    Get daily transactions
 * @route   GET /api/reports/daily
 * @access  Private
 */
exports.getDailyTransactions = async (req, res, next) => {
  try {
    // Parse date from query or use current date
    let targetDate;
    if (req.query.date) {
      targetDate = new Date(req.query.date);
    } else {
      targetDate = new Date();
    }

    // Set start and end of day
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get transactions for the specified day
    const transactions = await Transaction.find({
      performedAt: { $gte: startOfDay, $lte: endOfDay }
    })
      .sort({ performedAt: -1 })
      .populate('performedBy', 'name');

    // Calculate summary statistics
    const stockInCount = transactions.filter(
      (transaction) => transaction.transactionType === 'in'
    ).length;

    const stockOutCount = transactions.filter(
      (transaction) => transaction.transactionType === 'out'
    ).length;

    const stockInQuantity = transactions
      .filter((transaction) => transaction.transactionType === 'in')
      .reduce((total, transaction) => total + transaction.quantity, 0);

    const stockOutQuantity = transactions
      .filter((transaction) => transaction.transactionType === 'out')
      .reduce((total, transaction) => total + transaction.quantity, 0);

    res.status(200).json({
      success: true,
      data: {
        date: startOfDay,
        transactions,
        summary: {
          stockInCount,
          stockOutCount,
          totalTransactions: transactions.length,
          stockInQuantity,
          stockOutQuantity
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get stock movement report
 * @route   GET /api/reports/stock-movement
 * @access  Private
 */
exports.getStockMovement = async (req, res, next) => {
  try {
    // Parse timeframe from query
    const timeframe = req.query.timeframe || 'monthly';
    let groupFormat;
    let dateRange = {};

    const now = new Date();

    // Configure date range and grouping based on timeframe
    switch (timeframe) {
      case 'weekly':
        // Last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        dateRange = { $gte: weekAgo, $lte: now };
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$performedAt' } };
        break;
      case 'yearly':
        // Last 7 years
        const yearsAgo = new Date();
        yearsAgo.setFullYear(now.getFullYear() - 7);
        dateRange = { $gte: yearsAgo, $lte: now };
        groupFormat = { $dateToString: { format: '%Y', date: '$performedAt' } };
        break;
      default:
        // Monthly (last 12 months)
        const monthsAgo = new Date();
        monthsAgo.setMonth(now.getMonth() - 12);
        dateRange = { $gte: monthsAgo, $lte: now };
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$performedAt' } };
    }

    // Aggregate stock movement
    const stockMovement = await Transaction.aggregate([
      {
        $match: {
          performedAt: dateRange
        }
      },
      {
        $group: {
          _id: {
            period: groupFormat,
            type: '$transactionType'
          },
          quantity: { $sum: '$quantity' }
        }
      },
      {
        $sort: { '_id.period': 1 }
      }
    ]);

    // Format data for chart
    const labels = [...new Set(stockMovement.map(item => item._id.period))].sort();
    
    const stockInData = labels.map(label => {
      const entry = stockMovement.find(
        item => item._id.period === label && item._id.type === 'in'
      );
      return entry ? entry.quantity : 0;
    });
    
    const stockOutData = labels.map(label => {
      const entry = stockMovement.find(
        item => item._id.period === label && item._id.type === 'out'
      );
      return entry ? entry.quantity : 0;
    });

    // Format labels for display
    const formattedLabels = labels.map(label => {
      if (timeframe === 'yearly') return label; // Year is already in correct format
      if (timeframe === 'weekly') {
        // Format as 'Mon', 'Tue', etc.
        const date = new Date(label);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      // Monthly format as 'Jan', 'Feb', etc.
      const [year, month] = label.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short' });
    });

    res.status(200).json({
      success: true,
      data: {
        timeframe,
        labels: formattedLabels,
        rawLabels: labels,
        stockInData,
        stockOutData
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get inventory statistics
 * @route   GET /api/reports/inventory-stats
 * @access  Private
 */
exports.getInventoryStats = async (req, res, next) => {
  try {
    // Get total number of inventory items
    const totalItems = await InventoryItem.countDocuments();

    // Get total quantity of all items
    const totalQuantity = await InventoryItem.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$quantity' }
        }
      }
    ]);

    // Get items by component type
    const componentBreakdown = await InventoryItem.aggregate([
      {
        $group: {
          _id: '$component',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$itemPrice'] } }
        }
      },
      {
        $sort: { totalValue: -1 }
      }
    ]);

    // Get low stock items (less than 5 units)
    const lowStockItems = await InventoryItem.find({ quantity: { $lt: 5 } })
      .sort({ quantity: 1 })
      .select('partsName partsNumber component quantity');

    // Get zero stock items
    const outOfStockItems = await InventoryItem.find({ quantity: 0 })
      .select('partsName partsNumber component');

    // Get total inventory value
    const inventoryValue = await InventoryItem.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantity', '$itemPrice'] } }
        }
      }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ performedAt: -1 })
      .limit(5)
      .populate('performedBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        totalQuantity: totalQuantity.length > 0 ? totalQuantity[0].total : 0,
        componentBreakdown,
        lowStockItems,
        outOfStockItems,
        inventoryValue: inventoryValue.length > 0 ? inventoryValue[0].total : 0,
        recentTransactions
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get transaction history
 * @route   GET /api/reports/transactions
 * @access  Private
 */
exports.getTransactionHistory = async (req, res, next) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    let query = {};
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999); // Include all transactions on the end date
      
      query.performedAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    // Filter by transaction type
    if (req.query.type && ['in', 'out'].includes(req.query.type)) {
      query.transactionType = req.query.type;
    }
    
    // Filter by item ID
    if (req.query.itemId) {
      query.itemId = req.query.itemId;
    }
    
    // Search by item name or parts number
    if (req.query.search) {
      query.$or = [
        { partsName: { $regex: req.query.search, $options: 'i' } },
        { partsNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Count total transactions matching the query
    const total = await Transaction.countDocuments(query);
    
    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ performedAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('performedBy', 'name')
      .populate('itemId', 'partsName partsNumber component');
    
    // Prepare pagination info
    const pagination = {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
    
    res.status(200).json({
      success: true,
      pagination,
      data: transactions
    });
  } catch (err) {
    next(err);
  }
};
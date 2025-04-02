const InventoryItem = require('../models/InventoryItem');
const Transaction = require('../models/Transaction');

/**
 * @desc    Get all inventory items
 * @route   GET /api/inventory
 * @access  Private
 */
exports.getInventoryItems = async (req, res, next) => {
  try {
    // Build query based on request query parameters
    let query = {};

    // Filter by component
    if (req.query.component) {
      query.component = req.query.component;
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.itemPrice = {};
      if (req.query.minPrice) {
        query.itemPrice.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        query.itemPrice.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Filter by quantity range
    if (req.query.minQuantity || req.query.maxQuantity) {
      query.quantity = {};
      if (req.query.minQuantity) {
        query.quantity.$gte = parseInt(req.query.minQuantity);
      }
      if (req.query.maxQuantity) {
        query.quantity.$lte = parseInt(req.query.maxQuantity);
      }
    }

    // Search by name or part number
    if (req.query.search) {
      query.$or = [
        { partsName: { $regex: req.query.search, $options: 'i' } },
        { partsNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) {
        // Parse and format date string to DD/MM/YYYY
        const startDate = new Date(req.query.startDate);
        const formattedStartDate = `${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`;
        query.date.$gte = formattedStartDate;
      }
      if (req.query.endDate) {
        // Parse and format date string to DD/MM/YYYY
        const endDate = new Date(req.query.endDate);
        const formattedEndDate = `${String(endDate.getDate()).padStart(2, '0')}/${String(endDate.getMonth() + 1).padStart(2, '0')}/${endDate.getFullYear()}`;
        query.date.$lte = formattedEndDate;
      }
    }

    // Execute query with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const totalItems = await InventoryItem.countDocuments(query);
    const items = await InventoryItem.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Prepare pagination result
    const pagination = {
      total: totalItems,
      page,
      limit,
      pages: Math.ceil(totalItems / limit)
    };

    res.status(200).json({
      success: true,
      pagination,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single inventory item
 * @route   GET /api/inventory/:id
 * @access  Private
 */
exports.getInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new inventory item
 * @route   POST /api/inventory
 * @access  Private
 */
exports.createInventoryItem = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    // Create inventory item
    const inventoryItem = await InventoryItem.create(req.body);

    // Create transaction record for new item
    await Transaction.create({
      itemId: inventoryItem._id,
      partsName: inventoryItem.partsName,
      partsNumber: inventoryItem.partsNumber,
      transactionType: 'in',
      quantity: inventoryItem.quantity,
      previousQuantity: 0,
      newQuantity: inventoryItem.quantity,
      notes: 'Initial inventory creation',
      performedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: inventoryItem
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update inventory item
 * @route   PUT /api/inventory/:id
 * @access  Private
 */
exports.updateInventoryItem = async (req, res, next) => {
  try {
    let item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Track if quantity changed
    const previousQuantity = item.quantity;
    const newQuantity = req.body.quantity ? parseInt(req.body.quantity) : previousQuantity;

    // Update the updatedAt timestamp
    req.body.updatedAt = Date.now();

    // Update item
    item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Create transaction record if quantity changed
    if (newQuantity !== previousQuantity) {
      await Transaction.create({
        itemId: item._id,
        partsName: item.partsName,
        partsNumber: item.partsNumber,
        transactionType: newQuantity > previousQuantity ? 'in' : 'out',
        quantity: Math.abs(newQuantity - previousQuantity),
        previousQuantity,
        newQuantity,
        notes: `Updated via inventory management`,
        performedBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete inventory item
 * @route   DELETE /api/inventory/:id
 * @access  Private
 */
exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.remove();

    // Create transaction record for deleted item
    await Transaction.create({
      itemId: item._id,
      partsName: item.partsName,
      partsNumber: item.partsNumber,
      transactionType: 'out',
      quantity: item.quantity,
      previousQuantity: item.quantity,
      newQuantity: 0,
      notes: 'Item removed from inventory',
      performedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Process stock in/out
 * @route   POST /api/inventory/transaction
 * @access  Private
 */
exports.processTransaction = async (req, res, next) => {
  try {
    const { itemId, transactionType, quantity, notes } = req.body;

    // Validate inputs
    if (!itemId || !transactionType || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide itemId, transactionType, and quantity'
      });
    }

    // Validate transaction type
    if (!['in', 'out'].includes(transactionType)) {
      return res.status(400).json({
        success: false,
        message: 'Transaction type must be either "in" or "out"'
      });
    }

    // Find the inventory item
    const item = await InventoryItem.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Store the original quantity
    const previousQuantity = item.quantity;
    
    // Calculate new quantity
    let newQuantity;
    if (transactionType === 'in') {
      newQuantity = previousQuantity + parseInt(quantity);
    } else {
      // Check if enough stock is available
      if (previousQuantity < parseInt(quantity)) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock. Current quantity: ${previousQuantity}`
        });
      }
      newQuantity = previousQuantity - parseInt(quantity);
    }

    // Update inventory item quantity
    item.quantity = newQuantity;
    item.updatedAt = Date.now();
    await item.save();

    // Create transaction record
    const transaction = await Transaction.create({
      itemId: item._id,
      partsName: item.partsName,
      partsNumber: item.partsNumber,
      transactionType,
      quantity: parseInt(quantity),
      previousQuantity,
      newQuantity,
      notes: notes || `Stock ${transactionType === 'in' ? 'added to' : 'removed from'} inventory`,
      performedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      data: {
        transaction,
        item
      }
    });
  } catch (err) {
    next(err);
  }
};
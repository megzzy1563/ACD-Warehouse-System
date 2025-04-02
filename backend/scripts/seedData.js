/**
 * Seed script to populate the database with initial data
 * Used for development and testing purposes
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.success('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Sample users data
const users = [
  {
    name: 'ACD Admin',
    email: 'admin@acd-inventory.com',
    password: 'admin123456',
    role: 'admin'
  },
  {
    name: 'Store Manager',
    email: 'manager@acd-inventory.com',
    password: 'manager123',
    role: 'manager'
  },
  {
    name: 'Inventory User',
    email: 'user@acd-inventory.com',
    password: 'user123456',
    role: 'user'
  }
];

// Sample inventory items data
const inventoryItems = [
  
];

// Import all data
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await InventoryItem.deleteMany();
    await Transaction.deleteMany();
    
    logger.info('Existing data cleared');
    
    // Create users with hashed passwords
    const hashedUsers = await Promise.all(
      users.map(async user => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        return {
          ...user,
          password: hashedPassword
        };
      })
    );
    
    const createdUsers = await User.insertMany(hashedUsers);
    logger.success(`${createdUsers.length} users created`);
    
    // Admin user for references
    const adminUser = createdUsers[0]._id;
    
    // Create inventory items with admin user reference
    const itemsWithUser = inventoryItems.map(item => ({
      ...item,
      createdBy: adminUser
    }));
    
    const createdItems = await InventoryItem.insertMany(itemsWithUser);
    logger.success(`${createdItems.length} inventory items created`);
    
    // Create initial transactions for each item
    const transactions = createdItems.map(item => ({
      itemId: item._id,
      partsName: item.partsName,
      partsNumber: item.partsNumber,
      transactionType: 'in',
      quantity: item.quantity,
      previousQuantity: 0,
      newQuantity: item.quantity,
      notes: 'Initial inventory seed',
      performedBy: adminUser,
      performedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Random time in last 7 days
    }));
    
    await Transaction.insertMany(transactions);
    logger.success(`${transactions.length} transactions created`);
    
    logger.success('Data import completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error('Error importing data:', err);
    process.exit(1);
  }
};

// Delete all data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await InventoryItem.deleteMany();
    await Transaction.deleteMany();
    
    logger.success('All data successfully deleted');
    process.exit(0);
  } catch (err) {
    logger.error('Error deleting data:', err);
    process.exit(1);
  }
};

// Connect to database
connectDB().then(() => {
  // Check for command line arguments
  if (process.argv[2] === '-i') {
    importData();
  } else if (process.argv[2] === '-d') {
    deleteData();
  } else {
    logger.info('Command not recognized. Use "-i" to import data or "-d" to delete all data');
    process.exit(1);
  }
});
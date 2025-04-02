const User = require('../models/User');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Initialize database with admin user if it doesn't exist
 */
const initDatabase = async () => {
  try {
    // Check if admin user exists
    const adminEmail = 'admin@acd-inventory.com';
    const adminExists = await User.findOne({ email: adminEmail });

    if (!adminExists) {
      logger.info('Creating default admin user...');
      
      // Create admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123456', salt);
      
      await User.create({
        name: 'ACD Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      
      logger.success('Default admin user created successfully.');
      logger.info('Email: admin@acd-inventory.com, Password: admin123456');
      logger.warn('Please change the default admin password after first login.');
    } else {
      logger.info('Admin user already exists, skipping initialization.');
    }
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
};

module.exports = initDatabase;
/**
 * Configuration utility to manage application settings
 * Loads settings from environment variables with fallbacks
 */

// Server configuration
exports.server = {
    // Node environment: development, production, test
    env: process.env.NODE_ENV || 'development',
    
    // Server port
    port: parseInt(process.env.PORT, 10) || 5000,
    
    // API prefix for all routes
    apiPrefix: process.env.API_PREFIX || '/api'
  };
  
  // Database configuration
  exports.database = {
    // MongoDB URI
    uri: process.env.MONGO_URI,
    
    // MongoDB connection options
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  };
  
  // Authentication configuration
  exports.auth = {
    // JWT secret key
    jwtSecret: process.env.JWT_SECRET || 'acd_inventory_secret_key_2025',
    
    // JWT token expiration
    jwtExpire: process.env.JWT_EXPIRE || '30d',
    
    // Salt rounds for password hashing
    saltRounds: 10
  };
  
  // CORS configuration
  exports.cors = {
    // Origins allowed to access the API
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',') 
      : ['http://localhost:3000'],
    
    // HTTP methods allowed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    
    // Headers allowed
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  
  // File upload configuration
  exports.uploads = {
    // Maximum file size in bytes (5MB)
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    
    // Allowed file types
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  };
  
  // Pagination defaults
  exports.pagination = {
    // Default page size
    limit: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 10,
    
    // Maximum page size
    maxLimit: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100
  };
  
  // Application specific configuration
  exports.app = {
    // Inventory component types
    componentTypes: ['Engine', 'Hydraulic', 'Electrical', 'Mechanical', 'Body'],
    
    // Rack locations
    rackLocations: ['A1', 'A2', 'B1', 'B2', 'C1'],
    
    // User roles
    userRoles: ['admin', 'manager', 'user']
  };
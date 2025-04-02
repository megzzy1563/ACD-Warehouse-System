const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const initDatabase = require('./config/initDB');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const apiResponse = require('./middleware/apiResponse');
const logger = require('./utils/logger');
const fs = require('fs');

// Load environment variables (.env)
require('dotenv').config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb', extended: false }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Setup CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com', 'http://localhost:3000'] 
    : ['http://localhost:3000', 'http://192.168.254.126:3000'],  // Add your IP address here
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Create logs directory if it doesn't exist
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
  
  // Create a write stream for morgan logs
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Request logging middleware
app.use((req, res, next) => {
  logger.request(req);
  next();
});

// API response helpers
app.use(apiResponse);

// API Version and info
app.get('/', (req, res) => {
  res.success({
    name: 'ACD Inventory API',
    version: '1.0.0',
    status: 'running'
  }, 'API is running');
});

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/scan', require('./routes/scan')); // Moved from line 13 to here

// Global error handler
app.use(errorHandler);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Define port
const PORT = process.env.PORT || 5000;

// Start server and initialize database
const startServer = async () => {
  try {
    // Initialize database with default admin if needed
    await initDatabase();
    
    // Start Express server - listen on all interfaces
    app.listen(PORT, '0.0.0.0', () => {
      logger.success(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Close server & exit process
  process.exit(1);
});
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`Error in ${req.method} ${req.originalUrl}:`, err);

  let error = { ...err };
  error.message = err.message || 'Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value entered: ${field}`;
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = {};
    
    // Format validation errors
    Object.keys(err.errors).forEach(field => {
      errors[field] = err.errors[field].message;
    });
    
    return res.validationError(errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new Error('Invalid token');
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error = new Error('Token expired');
    error.statusCode = 401;
  }

  // Send the error response using our standardized format
  const statusCode = error.statusCode || 500;
  
  // For 500 errors, use serverError helper
  if (statusCode === 500) {
    return res.serverError(process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message);
  }
  
  // For other error types, use the generic error helper
  return res.error(
    error.message, 
    statusCode,
    process.env.NODE_ENV === 'production' ? null : err.stack
  );
};

module.exports = errorHandler;
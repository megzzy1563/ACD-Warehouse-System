/**
 * Simple logger utility for consistent logging
 */
const logger = {
    /**
     * Log information message
     * @param {string} message - Information message
     * @param {any} data - Additional data to log
     */
    info: (message, data = null) => {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.log(data);
      }
    },
  
    /**
     * Log success message
     * @param {string} message - Success message
     * @param {any} data - Additional data to log
     */
    success: (message, data = null) => {
      console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.log(data);
      }
    },
  
    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {any} data - Additional data to log
     */
    warn: (message, data = null) => {
      console.warn(`[WARNING] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.warn(data);
      }
    },
  
    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    error: (message, error = null) => {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
      if (error) {
        console.error(error);
        if (error.stack) {
          console.error(error.stack);
        }
      }
    },
  
    /**
     * Log database related message
     * @param {string} message - Database related message
     * @param {any} data - Additional data to log
     */
    db: (message, data = null) => {
      console.log(`[DATABASE] ${new Date().toISOString()} - ${message}`);
      if (data) {
        console.log(data);
      }
    },
  
    /**
     * Log API request information
     * @param {object} req - Express request object
     */
    request: (req) => {
      console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
      if (process.env.NODE_ENV === 'development' && Object.keys(req.body).length > 0) {
        // In development, log the request body, but mask sensitive fields
        const sensitiveFields = ['password', 'token', 'secret'];
        const maskedBody = { ...req.body };
        
        sensitiveFields.forEach(field => {
          if (maskedBody[field]) {
            maskedBody[field] = '******';
          }
        });
        
        console.log('Request Body:', maskedBody);
      }
    }
  };
  
  module.exports = logger;
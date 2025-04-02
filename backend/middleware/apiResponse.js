/**
 * API Response handling middleware
 * Extends Express response object with standardized response methods
 */
const apiResponse = (req, res, next) => {
    // Success response
    res.success = (data, message = 'Success', statusCode = 200) => {
      return res.status(statusCode).json({
        success: true,
        message,
        data
      });
    };
  
    // Error response
    res.error = (message, statusCode = 400, errors = null) => {
      const response = {
        success: false,
        message
      };
  
      if (errors) {
        response.errors = errors;
      }
  
      return res.status(statusCode).json(response);
    };
  
    // Not found response
    res.notFound = (message = 'Resource not found') => {
      return res.status(404).json({
        success: false,
        message
      });
    };
  
    // Unauthorized response
    res.unauthorized = (message = 'Unauthorized access') => {
      return res.status(401).json({
        success: false,
        message
      });
    };
  
    // Forbidden response
    res.forbidden = (message = 'Access forbidden') => {
      return res.status(403).json({
        success: false,
        message
      });
    };
  
    // Server error response
    res.serverError = (message = 'Internal server error') => {
      return res.status(500).json({
        success: false,
        message
      });
    };
  
    // Validation error response
    res.validationError = (errors) => {
      return res.status(422).json({
        success: false,
        message: 'Validation error',
        errors
      });
    };
  
    next();
  };
  
  module.exports = apiResponse;
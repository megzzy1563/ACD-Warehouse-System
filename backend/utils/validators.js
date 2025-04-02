/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Is email valid
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Contains the result and message
 */
exports.validatePasswordStrength = (password) => {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      message: 'Password must be at least 6 characters long'
    };
  }

  // Check for a stronger password (optional)
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  const isStrong = strongPasswordRegex.test(password);

  return {
    isValid: true,
    isStrong,
    message: isStrong
      ? 'Password is strong'
      : 'Password is valid but could be stronger (use uppercase, lowercase, numbers, and be at least 8 characters)'
  };
};

/**
 * Format date string from YYYY-MM-DD to DD/MM/YYYY or vice versa
 * @param {string} dateStr - Date string to format
 * @param {string} format - Target format ('db' for YYYY-MM-DD or 'display' for DD/MM/YYYY)
 * @returns {string} - Formatted date string
 */
exports.formatDateString = (dateStr, format = 'display') => {
  if (!dateStr) return '';
  
  // Convert YYYY-MM-DD to DD/MM/YYYY
  if (format === 'display' && dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  if (format === 'db' && dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};

/**
 * Parse and sanitize numeric values from form input
 * @param {string|number} value - The value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} - Parsed number or default value
 */
exports.parseNumericValue = (value, defaultValue = 0) => {
  if (value === undefined || value === null) return defaultValue;
  
  // If it's already a number, return it
  if (typeof value === 'number' && !isNaN(value)) return value;
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const sanitized = value.replace(/[₱,$,\s]/g, '');
    const parsed = parseFloat(sanitized);
    
    if (!isNaN(parsed)) return parsed;
  }
  
  return defaultValue;
};
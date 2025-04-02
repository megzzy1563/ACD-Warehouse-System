// src/utils/formatters.js

/**
 * Format number with commas for thousands/millions
 * 
 * @param {number} number - The number to format
 * @returns {string} Formatted number with commas
 */
export const formatNumberWithCommas = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  /**
   * Format currency value with peso sign and commas
   * 
   * @param {number} amount - The amount to format
   * @returns {string} Formatted currency with peso sign and commas
   */
  export const formatPeso = (amount) => {
    return `₱${formatNumberWithCommas(parseFloat(amount).toFixed(2))}`;
  };
  
  /**
   * Format date from YYYY-MM-DD to DD/MM/YYYY
   * 
   * @param {string} dateString - Date string in YYYY-MM-DD format
   * @returns {string} Formatted date in DD/MM/YYYY format
   */
  export const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };
  
  /**
   * Format date from DD/MM/YYYY to YYYY-MM-DD
   * 
   * @param {string} dateString - Date string in DD/MM/YYYY format
   * @returns {string} Formatted date in YYYY-MM-DD format
   */
  export const formatDateForInput = (dateString) => {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  };
  
  /**
   * Get relative time from now (e.g., "2 hours ago")
   * 
   * @param {Date} date - The date to compare
   * @returns {string} Relative time string
   */
  export const getRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
      // For older dates, return the actual date
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
  };
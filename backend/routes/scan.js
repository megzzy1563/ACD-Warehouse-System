const express = require('express');
const router = express.Router();

// Import controller functions
// Using destructuring to get the exported functions
const { processOCR, processBarcode } = require('../controllers/scanController');

// Define routes
router.post('/ocr', processOCR);
router.post('/barcode', processBarcode);

// Export the router
module.exports = router;
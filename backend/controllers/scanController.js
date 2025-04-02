// src/controllers/scanController.js
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const logger = require('../utils/logger');

// Initialize Google Cloud Vision client
// You'll need to set up authentication and environment variables
const vision = new ImageAnnotatorClient();

/**
 * @desc    Process image with OCR
 * @route   POST /api/scan/ocr
 * @access  Private
 */
exports.processOCR = async (req, res, next) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }
    
    // Remove data URL prefix (e.g., data:image/jpeg;base64,)
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Process image with Google Cloud Vision
    const [result] = await vision.textDetection(buffer);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No text detected in image'
      });
    }
    
    // Extract and return OCR results
    res.status(200).json({
      success: true,
      data: {
        fullText: detections[0].description,
        textBlocks: detections.slice(1).map(detection => ({
          text: detection.description,
          boundingPoly: detection.boundingPoly
        }))
      }
    });
  } catch (err) {
    logger.error('Error processing OCR:', err);
    
    // Provide meaningful error message
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'OCR service unavailable'
      });
    }
    
    next(err);
  }
};

/**
 * @desc    Process barcode/QR code
 * @route   POST /api/scan/barcode
 * @access  Private
 */
exports.processBarcode = async (req, res, next) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }
    
    // Remove data URL prefix
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Process image with Google Cloud Vision's document text detection
    const [result] = await vision.documentTextDetection(buffer);
    
    // Extract text, symbols, and layout information
    const fullTextAnnotation = result.fullTextAnnotation;
    
    res.status(200).json({
      success: true,
      data: {
        text: fullTextAnnotation ? fullTextAnnotation.text : '',
        pages: fullTextAnnotation ? fullTextAnnotation.pages : []
      }
    });
  } catch (err) {
    logger.error('Error processing barcode/document:', err);
    next(err);
  }
};
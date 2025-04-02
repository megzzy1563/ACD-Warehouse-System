/**
 * File upload utility functions
 * Handles image validation and processing
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

/**
 * Validate image data from base64 string
 * @param {string} base64String - Base64 encoded image data
 * @returns {object} - Validation result with status and message
 */
exports.validateBase64Image = (base64String) => {
  if (!base64String) {
    return {
      isValid: false,
      message: 'No image data provided'
    };
  }

  // Check if it's a valid base64 format
  let matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return {
      isValid: false,
      message: 'Invalid image format'
    };
  }

  // Extract the image type and data
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Check if mime type is allowed
  if (!config.uploads.allowedTypes.includes(mimeType)) {
    return {
      isValid: false,
      message: `Unsupported image format. Allowed types: ${config.uploads.allowedTypes.join(', ')}`
    };
  }

  // Check file size
  if (buffer.length > config.uploads.maxSize) {
    return {
      isValid: false,
      message: `Image is too large. Maximum size: ${config.uploads.maxSize / (1024 * 1024)}MB`
    };
  }

  return {
    isValid: true,
    mimeType,
    buffer,
    size: buffer.length
  };
};

/**
 * Get image extension from mime type
 * @param {string} mimeType - Image MIME type
 * @returns {string} - File extension
 */
exports.getImageExtension = (mimeType) => {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/gif':
      return '.gif';
    default:
      return '.jpg';
  }
};

/**
 * Save image to disk (for future implementation if needed)
 * Currently we're storing images as base64 in the database
 * @param {Buffer} buffer - Image buffer
 * @param {string} filename - Desired filename
 * @param {string} extension - File extension
 * @returns {Promise<string>} - Path to saved file
 */
exports.saveImageToDisk = async (buffer, filename, extension) => {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create full file path
    const filepath = path.join(uploadsDir, `${filename}${extension}`);

    // Write file to disk
    await fs.promises.writeFile(filepath, buffer);
    logger.info(`File saved: ${filepath}`);

    return filepath;
  } catch (error) {
    logger.error('Error saving image to disk:', error);
    throw new Error('Failed to save image');
  }
};

/**
 * Compress base64 image (simplified version for demo)
 * In a production app, you would use a library like sharp or jimp
 * @param {string} base64String - Base64 encoded image data
 * @returns {string} - Compressed base64 image or original if compression fails
 */
exports.compressBase64Image = (base64String) => {
  try {
    // This is a dummy function - in a real app, you would:
    // 1. Convert base64 to buffer
    // 2. Use image processing library to resize and compress
    // 3. Convert back to base64
    // 4. Return the compressed image

    // For this demo, we'll just return the original
    logger.info('Image compression requested (demo only - no actual compression)');
    return base64String;
  } catch (error) {
    logger.error('Error compressing image:', error);
    return base64String; // Return original on error
  }
};
// ENHANCED HYUNDAI PARTS LABEL SCANNER WITH EASYOCR VIA PYTHON SERVER
import { scanHyundaiPartLabel as easyOCRScan, startRealtimeScanning as easyOCRRealtimeScan } from './easyOCRClient';

/**
 * Detect region of interest (ROI) in a Hyundai part label
 * Based on examples provided by user
 */
const detectRegionOfInterest = async (imageDataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // 1. Find blue Hyundai header
      const blueHeaderRegion = findBlueHeader(canvas);
      
      // 2. If we found a blue header, look for text area below it
      let targetRegion = null;
      
      if (blueHeaderRegion) {
        // Text area is typically right below the blue header
        targetRegion = findTextAreaBelowHeader(canvas, blueHeaderRegion);
      }
      
      // 3. If we couldn't find a region using the header, try edge detection
      if (!targetRegion || !targetRegion.width || !targetRegion.height) {
        targetRegion = findPartNumberRegionByPattern(canvas);
      }
      
      // 4. If we still don't have a region, use color contrast
      if (!targetRegion || !targetRegion.width || !targetRegion.height) {
        targetRegion = findRegionByColorContrast(canvas);
      }
      
      // If we found a target region, crop and process it
      if (targetRegion && targetRegion.width > 0 && targetRegion.height > 0) {
        // Create a new canvas for the cropped region
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = targetRegion.width;
        croppedCanvas.height = targetRegion.height;
        
        const croppedCtx = croppedCanvas.getContext('2d');
        
        // Draw the cropped region
        croppedCtx.drawImage(
          canvas, 
          targetRegion.x, targetRegion.y, targetRegion.width, targetRegion.height,
          0, 0, targetRegion.width, targetRegion.height
        );
        
        // Convert to black and white for better OCR
        const bwCanvas = convertToBlackAndWhite(croppedCanvas);
        
        // Resolve with the processed region
        resolve({
          success: true,
          labelImage: bwCanvas.toDataURL('image/jpeg', 0.95),
          originalImage: imageDataUrl,
          region: targetRegion,
          confidence: 0.9
        });
      } else {
        // Fallback to full image if we couldn't find a region
        console.log('Could not detect ROI, using full image');
        
        // Convert full image to black and white
        const bwCanvas = convertToBlackAndWhite(canvas);
        
        resolve({
          success: true,
          labelImage: bwCanvas.toDataURL('image/jpeg', 0.95),
          originalImage: imageDataUrl,
          region: null,
          confidence: 0.5
        });
      }
    };
    
    img.src = imageDataUrl;
  });
};

/**
 * Find blue Hyundai header in the image
 */
const findBlueHeader = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Look for blue headers (Hyundai blue)
  const blueRegions = [];
  const width = canvas.width;
  const height = canvas.height;
  
  // Sample at intervals to improve performance
  const sampleStep = Math.max(1, Math.floor(width / 50));
  
  for (let y = 0; y < height; y += sampleStep) {
    let blueStretch = 0;
    let startX = -1;
    
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4;
      if (idx >= data.length) continue; // Guard against out of bounds
      
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Hyundai blue detection (deep blue to navy blue range)
      const isHyundaiBlue = (
        b > 80 && 
        b > r * 1.3 && 
        b > g * 1.3 &&
        r < 100 && 
        g < 100
      );
      
      if (isHyundaiBlue) {
        if (startX === -1) startX = x;
        blueStretch++;
      } else if (blueStretch > 0) {
        // If we found a blue stretch that's substantial
        if (blueStretch * sampleStep > width * 0.1) { // At least 10% of width
          blueRegions.push({
            x: startX,
            y: y,
            width: blueStretch * sampleStep,
            height: sampleStep * 2,
            confidence: 0.5 + (blueStretch * sampleStep / width) * 0.5 // Confidence based on width
          });
        }
        blueStretch = 0;
        startX = -1;
      }
    }
  }
  
  // Find the most likely header (largest blue region in the top half)
  if (blueRegions.length > 0) {
    // Sort by y position first, then by area
    blueRegions.sort((a, b) => {
      // Prioritize regions in top half
      if (a.y < height / 2 && b.y >= height / 2) return -1;
      if (a.y >= height / 2 && b.y < height / 2) return 1;
      
      // Then by size
      const aArea = a.width * a.height;
      const bArea = b.width * b.height;
      return bArea - aArea;
    });
    
    // Return the top result
    return blueRegions[0];
  }
  
  return null;
};

/**
 * Find text area (part number and name) below the blue header
 */
const findTextAreaBelowHeader = (canvas, headerRegion) => {
  // The part number and name area is typically immediately below the header
  // and spans the same width as the header
  
  // Check if the header region is valid
  if (!headerRegion || !headerRegion.width || !headerRegion.height) {
    return null;
  }
  
  // Define area below header where part number and name should be
  // Based on example images, this is typically a rectangle about 1.5-2x the header height
  const textAreaHeight = headerRegion.height * 2.5;
  
  // Create a region starting right below the header
  return {
    x: headerRegion.x,
    y: headerRegion.y + headerRegion.height,
    width: headerRegion.width,
    height: textAreaHeight
  };
};

/**
 * Find part number region by looking for patterns matching Hyundai part labels
 */
const findPartNumberRegionByPattern = (canvas) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Convert to grayscale for edge detection
  const imageData = ctx.getImageData(0, 0, width, height);
  const grayData = convertToGrayscale(imageData);
  
  // Detect horizontal lines that might indicate text areas
  const horizontalLines = [];
  
  // Scan for horizontal edges
  const edgeThreshold = 30;
  for (let y = 1; y < height - 1; y++) {
    let lineStart = -1;
    let lineLength = 0;
    
    for (let x = 1; x < width - 1; x++) {
      // Calculate vertical edge strength (difference between pixels above and below)
      const pixelAbove = getGrayscalePixel(grayData, x, y - 1, width);
      const pixelBelow = getGrayscalePixel(grayData, x, y + 1, width);
      const edgeStrength = Math.abs(pixelAbove - pixelBelow);
      
      if (edgeStrength > edgeThreshold) {
        // This is an edge pixel
        if (lineStart === -1) lineStart = x;
        lineLength++;
      } else if (lineStart !== -1) {
        // Edge ended, check if it's long enough to be a text line
        if (lineLength > width * 0.2) { // At least 20% of width
          horizontalLines.push({
            y: y,
            x: lineStart,
            width: lineLength
          });
        }
        lineStart = -1;
        lineLength = 0;
      }
    }
    
    // Check for line ending at image edge
    if (lineStart !== -1 && lineLength > width * 0.2) {
      horizontalLines.push({
        y: y,
        x: lineStart,
        width: lineLength
      });
    }
  }
  
  // Look for pairs of horizontal lines that could be part number areas
  if (horizontalLines.length >= 2) {
    // Sort by y position
    horizontalLines.sort((a, b) => a.y - b.y);
    
    // Find pairs of lines with appropriate spacing
    for (let i = 0; i < horizontalLines.length - 1; i++) {
      const line1 = horizontalLines[i];
      
      // Look for another line below, with spacing that matches part number + name height
      for (let j = i + 1; j < horizontalLines.length; j++) {
        const line2 = horizontalLines[j];
        const spacing = line2.y - line1.y;
        
        // Typical spacing for part number + name is ~30-50 pixels in most labels
        if (spacing >= 20 && spacing <= 60) {
          // Found potential part number area
          const x = Math.min(line1.x, line2.x);
          const w = Math.max(line1.x + line1.width, line2.x + line2.width) - x;
          
          return {
            x: x,
            y: line1.y - 5, // Start a bit above the first line
            width: w,
            height: spacing + 10 // Add some padding
          };
        }
      }
    }
  }
  
  return null;
};

/**
 * Find region by color contrast - looking for black text on white background
 */
const findRegionByColorContrast = (canvas) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // We'll look for areas with high contrast - black text on white background
  const contrastRegions = [];
  
  // Scan in horizontal strips
  const stripHeight = 20;
  for (let y = 0; y < height; y += stripHeight) {
    let highContrastCount = 0;
    
    // Check contrast in this strip
    for (let x = 0; x < width; x++) {
      for (let dy = 0; dy < stripHeight && y + dy < height; dy++) {
        const idx = ((y + dy) * width + x) * 4;
        if (idx >= data.length) continue;
        
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Calculate grayscale value
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Check if it's very dark (text) or very light (background)
        // which indicates potential text
        if (gray < 50 || gray > 200) {
          highContrastCount++;
        }
      }
    }
    
    // If this strip has high contrast, it might contain part information
    const contrastRatio = highContrastCount / (stripHeight * width);
    if (contrastRatio > 0.4) { // Adjust threshold as needed
      contrastRegions.push({
        y: y,
        height: stripHeight,
        contrastRatio: contrastRatio
      });
    }
  }
  
  // If we found high contrast regions, combine adjacent ones
  if (contrastRegions.length > 0) {
    const mergedRegions = [];
    let currentRegion = {
      y: contrastRegions[0].y,
      height: contrastRegions[0].height,
      contrastRatio: contrastRegions[0].contrastRatio
    };
    
    for (let i = 1; i < contrastRegions.length; i++) {
      const region = contrastRegions[i];
      
      // If this region is adjacent to current, merge them
      if (region.y <= currentRegion.y + currentRegion.height) {
        currentRegion.height = (region.y + region.height) - currentRegion.y;
        currentRegion.contrastRatio = Math.max(currentRegion.contrastRatio, region.contrastRatio);
      } else {
        // Not adjacent, save current and start new region
        mergedRegions.push(currentRegion);
        currentRegion = {
          y: region.y,
          height: region.height,
          contrastRatio: region.contrastRatio
        };
      }
    }
    
    // Add the last region
    mergedRegions.push(currentRegion);
    
    // Sort by contrast ratio and get the best region
    mergedRegions.sort((a, b) => b.contrastRatio - a.contrastRatio);
    
    // Return the region with highest contrast, spanning full width
    const bestRegion = mergedRegions[0];
    return {
      x: 0,
      y: bestRegion.y,
      width: width,
      height: bestRegion.height
    };
  }
  
  return null;
};

/**
 * Get grayscale pixel value with bounds checking
 */
const getGrayscalePixel = (grayData, x, y, width) => {
  if (x < 0 || y < 0 || x >= width || y >= grayData.length / width) {
    return 0;
  }
  return grayData[y * width + x];
};

/**
 * Convert image data to grayscale array
 */
const convertToGrayscale = (imageData) => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const grayData = new Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Calculate grayscale value
      grayData[y * width + x] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }
  
  return grayData;
};

/**
 * Convert canvas to black and white
 */
const convertToBlackAndWhite = (canvas) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Calculate average brightness for adaptive threshold
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
  }
  
  const avgBrightness = totalBrightness / (data.length / 4);
  const threshold = avgBrightness * 0.8; // Adjust threshold based on avg brightness
  
  // Apply binary thresholding
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert to grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Apply threshold
    const value = gray > threshold ? 255 : 0;
    
    // Set RGB channels to the same value (black or white)
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Main function for scanning Hyundai part labels - uses EasyOCR
 */
const scanHyundaiPartLabel = async (imageDataUrl) => {
  try {
    console.log('Starting Hyundai parts label recognition...');
    
    // Step 1: Detect region of interest, convert to black and white
    const detection = await detectRegionOfInterest(imageDataUrl);
    
    if (!detection.success) {
      return {
        success: false,
        error: detection.error || 'Could not process the image properly.'
      };
    }
    
    // Step 2: Use EasyOCR client to extract text and part information
    const result = await easyOCRScan(detection.labelImage);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Could not identify a valid part number. Please try again with better lighting.'
      };
    }
    
    console.log('Extracted Part Information:', result.result);
    
    // Step 3: Return results
    return {
      success: true,
      result: {
        partsNumber: result.result.partsNumber,
        partsName: result.result.partsName,
        component: result.result.component
      },
      confidence: result.confidence || {
        overall: 0.9,
        partNumber: 0.95,
        partName: 0.85
      }
    };
  } catch (error) {
    console.error('Error in Hyundai label recognition:', error);
    return {
      success: false,
      error: `Error: ${error.message}`
    };
  }
};

/**
 * Real-time optimized scanning function - uses EasyOCR client
 */
const startRealtimeScanning = (videoRef, canvasRef, setRealtimeResults, setProcessingFrame, realtimeScanning, scannerReady, scannerFPS) => {
  // Use the EasyOCR client version for real-time scanning
  return easyOCRRealtimeScan(
    videoRef, 
    canvasRef, 
    setRealtimeResults, 
    setProcessingFrame, 
    realtimeScanning, 
    scannerReady, 
    scannerFPS
  );
};

// No cleanup needed for EasyOCR as it runs on server
const cleanupEasyOCR = async () => {
  console.log('No cleanup needed for EasyOCR client');
  return Promise.resolve();
};

export { 
  scanHyundaiPartLabel, 
  startRealtimeScanning,
  cleanupEasyOCR 
};
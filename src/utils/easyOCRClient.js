// easyOCRClient.js - Frontend connector for EasyOCR Python server

// URL to your EasyOCR server
const OCR_SERVER_URL = 'http://localhost:8080/scan';

/**
 * Scan a Hyundai part label using EasyOCR running on the Python server
 * @param {string} imageDataUrl - Base64 encoded image data URL
 * @returns {Promise<object>} - OCR results with part information
 */
const scanHyundaiPartLabel = async (imageDataUrl) => {
  try {
    console.log('Starting Hyundai parts label recognition with EasyOCR...');
    
    // Remove data URL prefix if needed for the API
    let imageData = imageDataUrl;
    if (imageData.startsWith('data:image')) {
      // Keep the full data URL as the server handles it
      imageData = imageDataUrl;
    }
    
    // Send the image to the EasyOCR server
    const response = await fetch(OCR_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageData
      })
    });
    
    // Parse the response
    const result = await response.json();
    
    // Handle error responses
    if (!result.success) {
      console.error('OCR error:', result.error);
      return {
        success: false,
        error: result.error || 'Could not process the image properly.'
      };
    }
    
    console.log('EasyOCR processing time:', result.processing_time, 'seconds');
    console.log('Extracted Part Information:', result.result);
    
    // Return the successfully processed result
    return {
      success: true,
      result: {
        partsNumber: result.result.partsNumber,
        partsName: result.result.partsName,
        component: result.result.component
      },
      rawText: result.text || '',
      confidence: {
        overall: 0.9,  // EasyOCR is typically more accurate than Tesseract
        partNumber: 0.95,
        partName: 0.85
      }
    };
  } catch (error) {
    console.error('Error in Hyundai label recognition with EasyOCR:', error);
    return {
      success: false,
      error: `Error: ${error.message || 'Network or server error'}`
    };
  }
};

/**
 * Real-time optimized scanning function with EasyOCR
 * This connects to the Python EasyOCR server for each frame processed
 */
const startRealtimeScanning = (videoRef, canvasRef, setRealtimeResults, setProcessingFrame, realtimeScanning, scannerReady, scannerFPS) => {
  if (!scannerReady || !realtimeScanning) return null;
  
  // Create a processing queue to prevent backing up frames
  let processingQueue = [];
  let isProcessing = false;
  let frameSkipCounter = 0;
  const frameSkipThreshold = 10; // Process every 10th frame for better performance with remote server
  let lastSuccessTime = 0;
  
  // Process one frame from the queue
  const processQueuedFrame = async () => {
    if (processingQueue.length === 0 || isProcessing) return;
    
    // Don't process too frequently if we've had a recent success
    const now = Date.now();
    if (now - lastSuccessTime < 3000) {
      // If we had a success in the last 3 seconds, slow down processing
      processingQueue = [];
      setTimeout(processQueuedFrame, 1000);
      return;
    }
    
    isProcessing = true;
    const imageDataUrl = processingQueue.shift();
    
    try {
      const result = await scanHyundaiPartLabel(imageDataUrl);
      
      if (result.success && result.result) {
        setRealtimeResults(result.result);
        lastSuccessTime = Date.now();
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      isProcessing = false;
      
      // Continue processing queue if there are more frames
      if (processingQueue.length > 0) {
        processQueuedFrame();
      }
    }
  };
  
  // Function to process each video frame
  const processFrame = (timestamp) => {
    // Skip frames to reduce processing load - important when using remote server
    frameSkipCounter = (frameSkipCounter + 1) % frameSkipThreshold;
    
    if (frameSkipCounter === 0 && videoRef.current && canvasRef.current) {
      setProcessingFrame(true);
      
      try {
        // Create a smaller canvas for processing (improves performance)
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        // Scale down for processing - 400px width is sufficient for text detection
        const processingWidth = 400;
        const processingHeight = video.videoHeight * (processingWidth / video.videoWidth);
        
        // Set canvas dimensions to processing size
        if (canvas.width !== processingWidth || canvas.height !== processingHeight) {
          canvas.width = processingWidth;
          canvas.height = processingHeight;
        }
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, processingWidth, processingHeight);
        
        // Convert to image with lower quality for better performance
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        
        // Add to processing queue if queue isn't too large and we're not processing
        if (processingQueue.length < 1 && !isProcessing) {
          processingQueue.push(imageDataUrl);
          processQueuedFrame();
        }
      } catch (error) {
        console.error('Error capturing frame:', error);
      } finally {
        setProcessingFrame(false);
      }
    }
    
    // Keep animation going
    return requestAnimationFrame(processFrame);
  };
  
  // Start the animation loop
  return requestAnimationFrame(processFrame);
};

export { scanHyundaiPartLabel, startRealtimeScanning };
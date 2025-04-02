// src/components/Modals/ViewItemModal.js
import React, { useContext, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react'; // Fixed import - use named export
import { AppContext } from '../../context/AppContext';
import '../../styles/ModalStyles.css';

const ViewItemModal = () => {
  const { 
    showViewItemModal, 
    setShowViewItemModal, 
    selectedItem 
  } = useContext(AppContext);
  
  const [isVisible, setIsVisible] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false); // State for QR code modal
  const [isQRModalVisible, setIsQRModalVisible] = useState(false); // State for QR modal animation
  
  // New states for the sticker receipt modal
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [isStickerModalVisible, setIsStickerModalVisible] = useState(false);
  
  // Path to your Canva-designed sticker background (update this path)
  const stickerBackgroundPath = "/assets/acd corp.png";
  
  useEffect(() => {
    if (showViewItemModal) {
      // Small delay for animation to work properly
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
      setShowQRModal(false); // Reset QR modal state when closing main modal
      setIsQRModalVisible(false); // Also reset QR modal visibility
      setShowStickerModal(false); // Reset sticker modal state
      setIsStickerModalVisible(false); // Reset sticker modal visibility
    }
  }, [showViewItemModal]);
  
  // Close modal with fade-out effect
  const closeModal = () => {
    setIsVisible(false);
    setTimeout(() => setShowViewItemModal(false), 300);
  };

  // Open QR modal with animation
  const openQRModal = () => {
    setShowQRModal(true);
    // Small delay for animation to work properly
    setTimeout(() => setIsQRModalVisible(true), 50);
  };

  // Close QR modal with animation
  const closeQRModal = () => {
    setIsQRModalVisible(false);
    setTimeout(() => setShowQRModal(false), 300);
  };

  // Open sticker modal with animation
  const openStickerModal = () => {
    setShowStickerModal(true);
    // Small delay for animation to work properly
    setTimeout(() => setIsStickerModalVisible(true), 50);
  };

  // Close sticker modal with animation
  const closeStickerModal = () => {
    setIsStickerModalVisible(false);
    setTimeout(() => setShowStickerModal(false), 300);
  };

  // Enhanced formatPeso function for Philippine Peso formatting with thousand separators
  const formatPeso = (value) => {
    // Handle case when value is already a string (possibly already formatted)
    if (typeof value === 'string') {
      // Extract numeric value if it's already formatted
      value = parseFloat(value.replace(/[^\d.-]/g, ''));
      if (isNaN(value)) return '₱0.00';
    }
    
    // Format the number with Philippine Peso symbol and thousand separators
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Generate QR code data
  const generateQRData = () => {
    if (!selectedItem) return '';
    
    // Create an object with all the details we want to include in the QR code
    const qrData = {
      id: selectedItem.id,
      partsName: selectedItem.partsName,
      partsNumber: selectedItem.partsNumber,
      component: selectedItem.component,
      quantity: selectedItem.quantity,
      itemPrice: selectedItem.itemPrice,
      rack: selectedItem.rack,
      pic: selectedItem.pic,
      date: selectedItem.date || selectedItem.dateDisplay,
      poNumber: selectedItem.poNumber,
      ctplNumber: selectedItem.ctplNumber,
      tax: selectedItem.tax,
      totalAmount: selectedItem.totalAmount
    };
    
    // Convert the object to a JSON string
    return JSON.stringify(qrData);
  };

// Function to handle printing sticker with Canva design
const handlePrintSticker = () => {
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    // Get QR code data
    const qrData = generateQRData();
    
    // Use the full URL path for the background image
    // This ensures the image is properly loaded in the new window
    const fullBackgroundPath = window.location.origin + stickerBackgroundPath;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sticker - ${selectedItem.partsName}</title>
        <!-- Print-specific styles -->
        <style type="text/css" media="print">
          .part-number, .part-name {
            color: #012f8e !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
        <style>
          /* Thermal printer optimized styles */
          @page {
            size: 320px 190px; /* Match the exact size of preview */
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            width: 320px;
            height: 190px;
            overflow: hidden;
            font-family: 'Arial', sans-serif;
            position: relative;
            -webkit-print-color-adjust: exact !important; /* Chrome, Safari */
            color-adjust: exact !important; /* Firefox */
          }
          
          .sticker-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .sticker-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            object-fit: cover;
          }
          
          .content-wrapper {
            position: relative;
            z-index: 2;
            width: 100%;
            height: 100%;
          }
          
          .part-number {
            position: absolute;
            top: 70px;
            left: 30px;
            font-size: 22px;
            font-weight: bold;
            color: #012f8e !important; /* Force white with !important */
            text-shadow: 0 0 1px rgba(0,0,0,0.5);
            opacity: 1;
            -webkit-print-color-adjust: exact !important; /* Chrome, Safari */
            color-adjust: exact !important; /* Firefox */
          }
          
          .part-name {
            position: absolute;
            top: 105px;
            left: 30px;
            font-size: 16px;
            max-width: 160px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #012f8e !important; /* Force white with !important */
            text-shadow: 0 0 1px rgba(0,0,0,0.5);
            opacity: 1;
            -webkit-print-color-adjust: exact !important; /* Chrome, Safari */
            color-adjust: exact !important; /* Firefox */
          }
          
          .qr-code {
            position: absolute;
            top: 55px;
            right: 30px;
            background-color: white;
            padding: 4px;
            border-radius: 3px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            width: 80px;
            height: 80px;
          }
        </style>
        <!-- Import qrcode.js library -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      </head>
      <body onload="generateQR()">
        <div class="sticker-container">
          <!-- Background image (your Canva design) -->
          <img src="${fullBackgroundPath}" class="sticker-background" alt="Sticker Background" onload="checkImageLoaded(this)" onerror="handleImageError(this)" />
          
          <div class="content-wrapper">
            <!-- Dynamic content positioned over the background -->
            <div class="part-number">${selectedItem.partsNumber}</div>
            <div class="part-name">${selectedItem.partsName}</div>
            
            <!-- QR Code container -->
            <div class="qr-code" id="qrcode"></div>
          </div>
        </div>
        
        <script>
          // Function to check if image loaded correctly
          function checkImageLoaded(img) {
            console.log("Image loaded successfully:", img.src);
            // After a short delay to ensure everything is ready, print the page
            setTimeout(printAndClose, 800);
          }
          
          // Handle image loading error
          function handleImageError(img) {
            console.error("Failed to load image:", img.src);
            // Create a fallback text to show instead of image
            const container = img.parentNode;
            const fallbackDiv = document.createElement('div');
            fallbackDiv.style.position = 'absolute';
            fallbackDiv.style.top = '0';
            fallbackDiv.style.left = '0';
            fallbackDiv.style.width = '100%';
            fallbackDiv.style.height = '100%';
            fallbackDiv.style.backgroundColor = '#2c3e50';
            fallbackDiv.style.zIndex = '1';
            container.appendChild(fallbackDiv);
            
            // Add company name as text
            const companyText = document.createElement('div');
            companyText.textContent = "ACD Corporation";
            companyText.style.position = 'absolute';
            companyText.style.top = '20px';
            companyText.style.left = '30px';
            companyText.style.color = 'white';
            companyText.style.fontWeight = 'bold';
            companyText.style.zIndex = '2';
            container.appendChild(companyText);
            
            // After a short delay to ensure everything is ready, print the page
            setTimeout(printAndClose, 800);
          }
          
          // Function to generate the QR code
          function generateQR() {
            try {
              // Create QR code
              new QRCode(document.getElementById("qrcode"), {
                text: ${JSON.stringify(qrData)},
                width: 80,
                height: 80,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
              });
              console.log("QR code generated successfully");
            } catch(err) {
              console.error("Error generating QR code:", err);
            }
          }
          
          // Function to print and close the window
          function printAndClose() {
            try {
              window.print();
              console.log("Print dialog opened");
              setTimeout(() => {
                window.close();
              }, 1000);
            } catch(err) {
              console.error("Error during print:", err);
              alert("There was an error when trying to print. Please try again.");
            }
          }
        </script>
      </body>
      </html>
    `);
    
    // Close the document to finish writing
    printWindow.document.close();
  }
};
  // If no modal state or no item selected, don't render anything
  if (!showViewItemModal || !selectedItem) return null;

  // Get status badge color based on quantity
  const getQuantityStatusColor = (quantity) => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) return '#6c757d'; // Default gray
    if (qty <= 0) return '#dc3545'; // Red - Out of stock
    if (qty < 5) return '#ffc107'; // Yellow - Low stock
    if (qty >= 50) return '#28a745'; // Green - Good stock
    return '#17a2b8'; // Blue - Normal stock
  };

  return (
    <div className={`modal-overlay ${isVisible ? 'visible' : ''}`} onClick={closeModal}>
      <div 
        className={`modal-content-enhanced ${isVisible ? 'visible' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <div className="modal-header-enhanced">
          <h3><i className="fas fa-box-open"></i> Item Details</h3>
          <button className="close-button-enhanced" onClick={closeModal}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body-enhanced">
          <div className="item-view-layout">
            {/* Left side - Image and basic info */}
            <div className="item-left-panel">
              <div className="item-image-container">
                {selectedItem.imageData ? (
                  <img 
                    src={selectedItem.imageData} 
                    alt={selectedItem.partsName} 
                    className="item-detail-image"
                  />
                ) : (
                  <div className="item-image-placeholder">
                    <i className="fas fa-box"></i>
                    <span>No Image</span>
                  </div>
                )}
              </div>
              
              <div className="item-quick-info">
                <h2 className="item-title">{selectedItem.partsName}</h2>
                <div className="item-badges">
                  <span className="badge badge-component">
                    <i className="fas fa-cog"></i> {selectedItem.component}
                  </span>
                  <span className="badge badge-quantity" style={{
                    backgroundColor: getQuantityStatusColor(selectedItem.quantity)
                  }}>
                    <i className="fas fa-cubes"></i> QTY: {selectedItem.quantity}
                  </span>
                </div>
                <div className="item-price-tag">
                  <span className="price-label">Price:</span>
                  <span className="price-value">{formatPeso(selectedItem.itemPrice)}</span>
                </div>
              </div>
            </div>
            
            {/* Right side - Details grid */}
            <div className="item-details-grid">
              <div className="detail-row">
                <div className="detail-group">
                  <span className="detail-label">Parts Number</span>
                  <span className="detail-value">
                    <i className="fas fa-hashtag detail-icon"></i> {selectedItem.partsNumber}
                  </span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">PIC</span>
                  <span className="detail-value">
                    <i className="fas fa-user detail-icon"></i> {selectedItem.pic}
                  </span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-group">
                  <span className="detail-label">Rack Location</span>
                  <span className="detail-value">
                    <i className="fas fa-map-marker-alt detail-icon"></i> {selectedItem.rack}
                  </span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Date Added</span>
                  <span className="detail-value">
                    <i className="far fa-calendar-alt detail-icon"></i> {selectedItem.date || selectedItem.dateDisplay}
                  </span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-group">
                  <span className="detail-label">PO Number</span>
                  <span className="detail-value">
                    <i className="fas fa-file-invoice detail-icon"></i> {selectedItem.poNumber}
                  </span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">CTPL Number</span>
                  <span className="detail-value">
                    <i className="fas fa-barcode detail-icon"></i> {selectedItem.ctplNumber}
                  </span>
                </div>
              </div>
              
              {/* QR Code section moved here - below PO Number and CTPL Number */}
              <div className="item-qr-section">
                <div className="section-header">
                  <i className="fas fa-qrcode"></i>
                  <h4>Item QR Code</h4>
                </div>
                <p className="qr-description">
                  Scan this QR code to quickly access item details
                </p>
                <div className="qr-content">
                  <div className="qr-code-frame">
                    <QRCodeSVG 
                      id="item-qr-code"
                      value={generateQRData()}
                      size={130}
                      level="H"
                      includeMargin={true}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>
                  <div className="qr-code-info">
                    <div className="qr-info-item">
                      <i className="fas fa-info-circle"></i>
                      <span>Contains all item data</span>
                    </div>
                    <div className="qr-info-item">
                      <i className="fas fa-tag"></i>
                      <span>ID: {selectedItem.id}</span>
                    </div>
                    <div className="qr-info-item">
                      <i className="fas fa-barcode"></i>
                      <span>Part #: {selectedItem.partsNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="qr-actions">
                  <button 
                    className="qr-action-btn view-btn"
                    onClick={openQRModal}
                  >
                    <i className="fas fa-expand-alt"></i> View Larger
                  </button>
                  <button 
                    className="qr-action-btn print-btn"
                    onClick={openStickerModal}
                  >
                    <i className="fas fa-print"></i> Print Sticker
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Financial Information Card */}
          <div className="financial-card">
            <div className="financial-header">
              <i className="fas fa-chart-line"></i>
              <h4>Financial Details</h4>
            </div>
            <div className="financial-body">
              <div className="financial-grid">
                <div className="financial-item">
                  <div className="circle-icon">
                    <i className="fas fa-tag"></i>
                  </div>
                  <div className="financial-details">
                    <span className="financial-label">Item Price</span>
                    <span className="financial-value">{formatPeso(selectedItem.itemPrice)}</span>
                  </div>
                </div>
                
                <div className="financial-item">
                  <div className="circle-icon">
                    <i className="fas fa-percentage"></i>
                  </div>
                  <div className="financial-details">
                    <span className="financial-label">Tax</span>
                    <span className="financial-value">{formatPeso(selectedItem.tax)}</span>
                  </div>
                </div>
                
                <div className="financial-item total">
                  <div className="circle-icon">
                    <i className="fas fa-coins"></i>
                  </div>
                  <div className="financial-details">
                    <span className="financial-label">Total Amount</span>
                    <span className="financial-value total-value">{formatPeso(selectedItem.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="modal-footer-enhanced">
          <button className="btn btn-close" onClick={closeModal}>
            <i className="fas fa-times"></i> Close
          </button>
        </div>
      </div>
      
      {/* QR Code Modal - For larger view */}
      {showQRModal && (
        <div 
          className={`qr-modal-overlay ${isQRModalVisible ? 'visible' : ''}`}
          onClick={closeQRModal}
        >
          <div 
            className={`qr-modal-content ${isQRModalVisible ? 'visible' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="qr-modal-header">
              <h3><i className="fas fa-qrcode"></i> Item QR Code</h3>
              <button 
                className="close-button-enhanced" 
                onClick={closeQRModal}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="qr-modal-body">
              <div className="qr-code-container">
                <QRCodeSVG
                  value={generateQRData()}
                  size={300}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
              <div className="qr-info-card">
                <div className="qr-info-header">
                  <h4>{selectedItem.partsName}</h4>
                  <span className="qr-info-id">ID: {selectedItem.id}</span>
                </div>
                <div className="qr-info-details">
                  <div className="qr-info-row">
                    <div className="qr-info-label">Parts #:</div>
                    <div className="qr-info-value">{selectedItem.partsNumber}</div>
                  </div>
                  <div className="qr-info-row">
                    <div className="qr-info-label">Component:</div>
                    <div className="qr-info-value">{selectedItem.component}</div>
                  </div>
                  <div className="qr-info-row">
                    <div className="qr-info-label">Location:</div>
                    <div className="qr-info-value">{selectedItem.rack}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="qr-modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={openStickerModal}
              >
                <i className="fas fa-print"></i> Print Sticker
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={closeQRModal}
              >
                <i className="fas fa-times"></i> Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sticker Preview Modal - Simplified version that matches your screenshot */}
      {showStickerModal && (
        <div 
          className={`sticker-modal-overlay ${isStickerModalVisible ? 'visible' : ''}`}
          onClick={closeStickerModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            opacity: isStickerModalVisible ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        >
          <div 
            className={`sticker-modal-content ${isStickerModalVisible ? 'visible' : ''}`}
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
              width: '360px',
              maxWidth: '95%',
              transform: isStickerModalVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'transform 0.3s ease',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header - Matching the style from your screenshot */}
            <div style={{
              padding: '10px 15px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#2980b9', // Blue header matching your screenshot
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-tag" style={{ fontSize: '16px' }}></i>
                <span style={{ fontSize: '18px', fontWeight: '500' }}>Sticker Preview</span>
              </div>
              <button 
                onClick={closeStickerModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {/* Sticker Preview Content - Matches your screenshot */}
            <div style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              {/* Sticker Preview Image */}
              <div style={{
                position: 'relative',
                width: '320px',
                height: '190px',
                marginBottom: '20px',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                overflow: 'hidden'
              }}>
                {/* Background image */}
                <img 
                  src={stickerBackgroundPath} 
                  alt="Sticker Background"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                
                {/* Part Number - positioned to match your screenshot */}
                <div style={{
                  position: 'absolute',
                  top: '70px',
                  left: '30px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#012f8e',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {selectedItem.partsNumber}
                </div>
                
                {/* Part Name - positioned to match your screenshot */}
                <div style={{
                  position: 'absolute',
                  top: '100px',
                  left: '30px',
                  fontSize: '14px',
                  color: '#012f8e',
                  maxWidth: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {selectedItem.partsName}
                </div>
                
                {/* QR Code - positioned to match your screenshot */}
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  right: '30px',
                  background: 'white',
                  padding: '5px',
                  borderRadius: '3px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}>
                  <QRCodeSVG 
                    value={generateQRData()}
                    size={80}
                    level="H"
                    includeMargin={false}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>
              </div>
            </div>
            
            {/* Footer Buttons - matching your screenshot */}
            <div style={{
              padding: '15px 20px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: 'white'
            }}>
              <button 
                onClick={handlePrintSticker}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '500'
                }}
              >
                <i className="fas fa-print"></i> Print Sticker
              </button>
              <button 
                onClick={closeStickerModal}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewItemModal;
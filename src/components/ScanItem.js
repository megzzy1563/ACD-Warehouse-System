// src/components/ScanItem.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import QrScanner from 'react-qr-scanner';
import api from '../services/api';
import '../styles/ScanStyles.css';

const ScanItem = () => {
  const { addNotification, inventoryItems, fetchInventoryItems, processTransaction } = useContext(AppContext);
  
  // State for form data
  const [formData, setFormData] = useState({
    itemId: '',
    transactionType: 'in',
    quantity: 1,
    notes: ''
  });
  
  // Fetch inventory items on component mount
  useEffect(() => {
    // Only fetch if inventoryItems is empty
    if (inventoryItems.length === 0) {
      fetchInventoryItems();
    }
  }, []);
  
  // Scanner animation state
  const [isScanning, setIsScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  
  // Add processing state
  const [processing, setProcessing] = useState(false);
  
  // Camera access states
  const [scanError, setScanError] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for back camera, 'user' for front
  
  // Handle form input changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
  };
  
  // Initialize cameras for scanning
  useEffect(() => {
    const getCameras = async () => {
      try {
        // First request permission
        await navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            // Stop the stream immediately
            stream.getTracks().forEach(track => track.stop());
          });
        
        // Then get devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        
        console.log('Available cameras:', cameras);
        setVideoDevices(cameras);
        
        // Set default camera (prefer back camera)
        if (cameras.length > 0) {
          const rearCamera = cameras.find(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('rear')
          );
          
          if (rearCamera) {
            setSelectedCamera(rearCamera.deviceId);
          } else if (cameras.length > 1) {
            setSelectedCamera(cameras[1].deviceId);
          } else {
            setSelectedCamera(cameras[0].deviceId);
          }
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
        setScanError('Camera access error: ' + error.message);
      }
    };
    
    getCameras();
    
    // Clean up function
    return () => {
      if (isScanning) {
        setIsScanning(false);
      }
    };
  }, []);
  
  // Handle scan result
  const handleScan = (data) => {
    if (!data) return;
    
    console.log('QR code scanned:', data);
    const scannedData = data.text; // Get the text from the scan result
    
    try {
      let parsedData;
      try {
        // First attempt: parse as JSON
        parsedData = JSON.parse(scannedData);
        console.log('Successfully parsed JSON data:', parsedData);
      } catch (jsonError) {
        console.log('Not valid JSON, treating as plain text:', scannedData);
        // If not valid JSON, treat it as a plain text code (like a part number)
        parsedData = { rawValue: scannedData };
      }
      
      // Find the item in inventory
      let foundItem;
      
      // Try multiple methods to identify the item
      if (parsedData.id) {
        // Method 1: Find by id
        foundItem = inventoryItems.find(item => item._id === parsedData.id);
      } 
      
      if (!foundItem && parsedData.partsNumber) {
        // Method 2: Find by parts number
        foundItem = inventoryItems.find(item => item.partsNumber === parsedData.partsNumber);
      }
      
      if (!foundItem && parsedData.rawValue) {
        // Method 3: Find by raw value as parts number or id
        foundItem = inventoryItems.find(item => 
          item.partsNumber === parsedData.rawValue || 
          item._id === parsedData.rawValue
        );
      }
      
      if (foundItem) {
        // Found item - update form
        setFormData({
          ...formData,
          itemId: foundItem._id
        });
        
        // Add to recent scans
        setRecentScans([
          {
            id: foundItem.partsName,
            type: 'scan',
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            status: 'success'
          },
          ...recentScans.slice(0, 4)
        ]);
        
        // Show success toast
        showToast('success', `Item found: ${foundItem.partsName}`);
        
        // Play success sound
        playSound('success');
      } else {
        // Item not found
        const identifier = parsedData.partsNumber || parsedData.id || parsedData.rawValue || 'Unknown';
        
        setRecentScans([
          {
            id: identifier,
            type: 'scan',
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            status: 'error'
          },
          ...recentScans.slice(0, 4)
        ]);
        
        showToast('error', `Item not found: ${identifier}`);
        playSound('error');
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      
      setRecentScans([
        {
          id: 'Invalid QR Code',
          type: 'scan',
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          status: 'error'
        },
        ...recentScans.slice(0, 4)
      ]);
      
      showToast('error', 'Invalid QR code format');
      playSound('error');
    }
  };
  
  // Handle scan errors
  const handleError = (err) => {
    console.error('QR Scan error:', err);
    setScanError(`Scanner error: ${err.message || 'Unknown error'}`);
  };
  
  // Play sound effect
  const playSound = (type) => {
    try {
      const audio = new Audio(`/assets/sounds/${type === 'success' ? 'beep.mp3' : 'error.mp3'}`);
      audio.play().catch(() => {
        // Handle audio play errors silently
      });
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  };
  
  // Toggle camera (front/back)
  const toggleCamera = () => {
    setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
  };
  
  // Camera selection change handler
  const handleCameraChange = (e) => {
    const deviceId = e.target.value;
    setSelectedCamera(deviceId);
  };
  
  // Process transaction through API - RENAMED to avoid conflict with context function
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.itemId) {
      showToast('error', 'Please select an item');
      return;
    }
    
    try {
      console.log('Processing transaction with data:', formData);
      setProcessing(true);
      
      const transactionData = {
        itemId: formData.itemId,
        transactionType: formData.transactionType,
        quantity: parseInt(formData.quantity),
        notes: formData.notes
      };
      
      // Call the context processTransaction function
      const result = await processTransaction(transactionData);
      
      if (result.success) {
        // Find the item name for better feedback
        const itemName = result.item.partsName;
        
        // Add to recent scans
        setRecentScans([
          {
            id: itemName,
            type: formData.transactionType,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            status: 'success'
          },
          ...recentScans.slice(0, 4) // Keep only the 5 most recent scans
        ]);
        
        // Reset form
        setFormData({
          itemId: '',
          transactionType: 'in',
          quantity: 1,
          notes: ''
        });
        
        // Show success message with toast
        showToast('success', 'Transaction recorded successfully!');
      } else {
        // Show error message
        showToast('error', result.error || 'Transaction failed. Please try again.');
        
        // Add to recent scans
        setRecentScans([
          {
            id: `Transaction Failed`,
            type: formData.transactionType,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            status: 'error'
          },
          ...recentScans.slice(0, 4)
        ]);
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      // Show error message
      showToast('error', error.message || 'Transaction failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  // Helper function to show toast messages
  const showToast = (type, message) => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i></div>
      <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  };

  return (
    <div className="content-section scan-section">
      <div className="scan-header">
        <div className="page-title">
          <i className="fas fa-barcode"></i>
          <h2>Scan Inventory</h2>
        </div>
      </div>
      
      <div className="scan-content">
        {/* Left Side - Scanner */}
        <div className="scan-left-panel">
          <div className="card scanner-card">
            <div className="card-header">
              <h3><i className="fas fa-qrcode"></i> Code Scanner</h3>
              
              {videoDevices.length > 1 && (
                <div className="camera-selector">
                  <select value={selectedCamera} onChange={handleCameraChange}>
                    {videoDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
            </div>
            
            <div className={`scanner-container ${isScanning ? 'active' : ''}`}>
              {isScanning ? (
                <div className="scanner-viewport">
                  <QrScanner
                    delay={300}
                    onError={handleError}
                    onScan={handleScan}
                    style={{ width: '100%', height: '250px' }}
                    constraints={{
                      audio: false,
                      video: {
                        facingMode: facingMode,
                        ...(selectedCamera && { deviceId: selectedCamera })
                      }
                    }}
                  />
                  <div className="scanning-frame">
                    <div className="corner top-left"></div>
                    <div className="corner top-right"></div>
                    <div className="corner bottom-left"></div>
                    <div className="corner bottom-right"></div>
                    <div className="scanning-line"></div>
                  </div>
                  <div className="scanner-controls">
                    <button 
                      type="button" 
                      className="scanner-control-btn toggle-camera"
                      onClick={toggleCamera}
                    >
                      <i className="fas fa-sync-alt"></i> Switch Camera
                    </button>
                    <button 
                      type="button" 
                      className="scanner-control-btn stop" 
                      onClick={() => setIsScanning(false)}
                    >
                      <i className="fas fa-stop"></i> Stop Scanner
                    </button>
                  </div>
                </div>
              ) : (
                <div className="scanner-placeholder">
                  <i className="fas fa-qrcode scanner-icon"></i>
                  <div className="scanner-text">Ready to scan QR codes</div>
                  <div className="scanner-subtext">Works with item stickers and digital QR codes</div>
                  <button 
                    className="scanner-control-btn start" 
                    onClick={() => {
                      setScanError(null);
                      setIsScanning(true);
                    }}
                  >
                    <i className="fas fa-camera"></i> Start Scanner
                  </button>
                </div>
              )}
              
              {/* Error message */}
              {scanError && (
                <div className="scan-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{scanError}</span>
                </div>
              )}
            </div>
            
            <div className="recent-scans">
              <h4><i className="fas fa-history"></i> Recent Scans</h4>
              <div className="scans-list">
                {recentScans.length > 0 ? (
                  recentScans.map((scan, index) => (
                    <div key={index} className="scan-item">
                      <div className="scan-info">
                        <div className="scan-id">{scan.id}</div>
                        <div className="scan-time">{scan.timestamp}</div>
                      </div>
                      <div className="scan-status">
                        <span className={`scan-badge ${scan.type}`}>
                          <i className={`fas fa-${scan.type === 'in' ? 'arrow-down' : scan.type === 'out' ? 'arrow-up' : 'qrcode'}`}></i>
                          {scan.type === 'in' ? 'In' : scan.type === 'out' ? 'Out' : 'Scan'}
                        </span>
                        <span className={`scan-result ${scan.status}`}>
                          <i className={`fas fa-${scan.status === 'success' ? 'check-circle' : 'times-circle'}`}></i>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-scans">No recent scans</div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Manual Entry */}
        <div className="scan-right-panel">
          <div className="card manual-entry-card">
            <div className="card-header">
              <h3><i className="fas fa-keyboard"></i> Manual Entry</h3>
            </div>
            
            <form className="manual-entry-form" onSubmit={handleTransactionSubmit}>
              <div className="form-section">
                <div className="section-header">
                  <i className="fas fa-info-circle"></i>
                  <h4>Item Information</h4>
                </div>
                
                <div className="form-row">
                  {/* CHANGED: Now using a dropdown to select from real inventory items */}
                  <div className="form-group">
                    <label htmlFor="itemId">
                      Select Item <span className="required">*</span>
                    </label>
                    <div className="select-container">
                      <select 
                        id="itemId" 
                        value={formData.itemId}
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled>Select an item</option>
                        {inventoryItems.map(item => (
                          <option key={item._id || item.id} value={item._id || item.id}>
                            {item.partsName} ({item.partsNumber})
                          </option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down"></i>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="quantity">
                      Quantity <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="number" 
                        id="quantity" 
                        min="1" 
                        value={formData.quantity}
                        onChange={handleChange}
                        required
                      />
                      <div className="input-icon-container">
                        <i className="fas fa-sort"></i>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="transactionType">Transaction Type</label>
                  <div className="transaction-toggle">
                    <label className={`toggle-option ${formData.transactionType === 'in' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="transactionType" 
                        id="transactionTypeIn"
                        value="in"
                        checked={formData.transactionType === 'in'}
                        onChange={() => setFormData({...formData, transactionType: 'in'})}
                      />
                      <i className="fas fa-arrow-down"></i>
                      Stock In
                    </label>
                    <label className={`toggle-option ${formData.transactionType === 'out' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="transactionType" 
                        id="transactionTypeOut"
                        value="out"
                        checked={formData.transactionType === 'out'}
                        onChange={() => setFormData({...formData, transactionType: 'out'})}
                      />
                      <i className="fas fa-arrow-up"></i>
                      Stock Out
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <div className="section-header">
                  <i className="fas fa-sticky-note"></i>
                  <h4>Additional Details</h4>
                </div>
                
                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea 
                    id="notes" 
                    placeholder="Add any additional information about this transaction"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="4"
                  ></textarea>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setFormData({
                    itemId: '',
                    transactionType: 'in',
                    quantity: 1,
                    notes: ''
                  })}
                  disabled={processing}
                >
                  <i className="fas fa-undo"></i> Reset
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i> Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i> Submit Transaction
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanItem;
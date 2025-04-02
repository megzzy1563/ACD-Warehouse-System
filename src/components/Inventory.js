// src/components/Inventory.js - Enhanced with optimized Hyundai parts label scanner
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { formatNumberWithCommas, formatPeso } from '../utils/formatters';
import { exportToExcel } from '../utils/excelExport';
import { scanHyundaiPartLabel, startRealtimeScanning } from '../utils/scannerUtils';
import * as XLSX from 'xlsx';
import '../styles/InventoryStyles.css';

const Inventory = () => {
  const { 
    inventoryItems, 
    deleteInventoryItem, 
    setShowAddItemModal, 
    setShowViewItemModal,
    setSelectedItem,
    importItemsToInventory
  } = useContext(AppContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Add filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: ''
    },
    priceRange: {
      min: '',
      max: ''
    },
    quantityRange: {
      min: '',
      max: ''
    },
    components: [],
    isFiltered: false
  });
  
  // Add state for scan item modal
  const [showScanItemModal, setShowScanItemModal] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [capturingImage, setCapturingImage] = useState(false);
  const [scanError, setScanError] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  
  // Real-time scanning states
  const [realtimeScanning, setRealtimeScanning] = useState(false);
  const [realtimeResults, setRealtimeResults] = useState(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [processingFrame, setProcessingFrame] = useState(false);
  const [scannerFPS, setScannerFPS] = useState(1); // Start with 1 frame per second
  
  // Reference to store animation frame ID
  const animationRef = useRef(null);
  
  // Add debouncing mechanism to avoid UI lag
  let lastResultUpdate = 0;
  const RESULT_UPDATE_THROTTLE = 300; // milliseconds
  
  const [scanFormData, setScanFormData] = useState({
    partsNumber: '',
    partsName: '',
    component: '',
    quantity: 1,
    itemPrice: '',
    date: new Date().toISOString().split('T')[0],
    tax: 0,
    rack: '',
    pic: '',
    poNumber: '',
    ctplNumber: '',
    totalAmount: 0
  });
  
  // Camera selection state
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  
  // Scanner video ref
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Predefined component categories
  const componentCategories = ['Engine', 'Hydraulic', 'Electrical', 'Mechanical', 'Body'];
  
  // Filter inventory items based on search term and filters
  const filteredItems = inventoryItems.filter(item => {
    // Search term filter
    const matchesSearch = 
      item.partsName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partsNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.component.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Only apply additional filters if filtering is active
    if (!filters.isFiltered) return true;
    
    // Date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      const itemDate = new Date(item.date);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59); // Include the end date fully
      
      if (itemDate < startDate || itemDate > endDate) {
        return false;
      }
    }
    
    // Price range filter
    if (filters.priceRange.min && parseFloat(item.itemPrice) < parseFloat(filters.priceRange.min)) {
      return false;
    }
    if (filters.priceRange.max && parseFloat(item.itemPrice) > parseFloat(filters.priceRange.max)) {
      return false;
    }
    
    // Quantity range filter
    if (filters.quantityRange.min && parseInt(item.quantity) < parseInt(filters.quantityRange.min)) {
      return false;
    }
    if (filters.quantityRange.max && parseInt(item.quantity) > parseInt(filters.quantityRange.max)) {
      return false;
    }
    
    // Component filter - case insensitive comparison
    if (filters.components.length > 0 && !filters.components.some(comp => 
      item.component.toLowerCase() === comp.toLowerCase() ||
      item.component.toLowerCase().includes(comp.toLowerCase())
    )) {
      return false;
    }
    
    return true;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Enumerate available cameras when scan modal opens
  useEffect(() => {
    if (showScanItemModal) {
      const getVideoDevices = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cameras = devices.filter(device => device.kind === 'videoinput');
          
          setVideoDevices(cameras);
          
          // If we have cameras, select the rear camera by default or the first camera
          if (cameras.length > 0) {
            // Try to find a rear/back camera
            const rearCamera = cameras.find(camera => 
              camera.label.toLowerCase().includes('back') || 
              camera.label.toLowerCase().includes('rear')
            );
            
            // Set the selected camera to rear camera if found, otherwise first camera
            setSelectedCamera(rearCamera ? rearCamera.deviceId : cameras[0].deviceId);
          }
        } catch (error) {
          console.error('Error enumerating devices:', error);
        }
      };
      
      getVideoDevices();
    }
  }, [showScanItemModal]);

  // Clean up scanner and real-time scanning when unmounting
  useEffect(() => {
    return () => {
      // Cancel any animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopScanner();
    };
  }, []);
  
  // Close scanner when modal is closed
  useEffect(() => {
    if (!showScanItemModal && scannerActive) {
      stopScanner();
    }
  }, [showScanItemModal]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter button click
  const handleFilterClick = () => {
    setShowFilterModal(true);
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => {
      // Create a new object to avoid direct state mutation
      const newFilters = { ...prevFilters };
      
      switch (filterType) {
        case 'dateStart':
          newFilters.dateRange.start = value;
          break;
        case 'dateEnd':
          newFilters.dateRange.end = value;
          break;
        case 'priceMin':
          newFilters.priceRange.min = value;
          break;
        case 'priceMax':
          newFilters.priceRange.max = value;
          break;
        case 'quantityMin':
          newFilters.quantityRange.min = value;
          break;
        case 'quantityMax':
          newFilters.quantityRange.max = value;
          break;
        case 'component':
          // Toggle component selection
          if (newFilters.components.includes(value)) {
            newFilters.components = newFilters.components.filter(comp => comp !== value);
          } else {
            newFilters.components = [...newFilters.components, value];
          }
          break;
        default:
          break;
      }
      
      return newFilters;
    });
  };

  // Apply filters
  const applyFilters = () => {
    setFilters(prevFilters => ({
      ...prevFilters,
      isFiltered: true
    }));
    setShowFilterModal(false);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      dateRange: {
        start: '',
        end: ''
      },
      priceRange: {
        min: '',
        max: ''
      },
      quantityRange: {
        min: '',
        max: ''
      },
      components: [],
      isFiltered: false
    });
    setShowFilterModal(false);
  };

  // Handle view item details
  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowViewItemModal(true);
  };

  // Handle edit item
  const handleEditItem = (item) => {
    setSelectedItem(item);
    setShowAddItemModal(true);
  };

  const handleDeleteItem = (item) => {
    if (window.confirm(`Are you sure you want to delete ${item.partsName}?`)) {
      console.log('Deleting item:', item); // Add this line
      deleteInventoryItem(item.id);
    }
  };

  // Handle add new item
  const handleAddItem = () => {
    setSelectedItem(null);
    setShowAddItemModal(true);
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentItems.map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual row selection
  const handleRowSelect = (itemId) => {
    if (selectedRows.includes(itemId)) {
      setSelectedRows(selectedRows.filter(id => id !== itemId));
    } else {
      setSelectedRows([...selectedRows, itemId]);
    }
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    // If no items selected, export all filtered items
    const itemsToExport = selectedRows.length > 0 
      ? filteredItems.filter(item => selectedRows.includes(item.id))
      : filteredItems;
    
    if (itemsToExport.length === 0) {
      alert('No items to export');
      return;
    }
    
    const success = exportToExcel(itemsToExport, 'inventory_export');
    if (success) {
      alert('Inventory data exported successfully!');
    } else {
      alert('Failed to export data. Please try again.');
    }
  };

  // Handle camera selection change
  const handleCameraChange = (e) => {
    setSelectedCamera(e.target.value);
    // If the scanner is active, restart it with the new camera
    if (scannerActive) {
      stopScanner();
      setTimeout(() => {
        startScanner();
      }, 500);
    }
  };

  // Import from Excel/CSV function
  const handleImportFromExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      // Create a new FileReader
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        // Check if it's a CSV file
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        let jsonData = [];
        
        if (isCSV) {
          // Parse CSV using PapaParse if available, or fallback to text parsing
          try {
            const csvText = e.target.result;
            // Simple CSV parsing if PapaParse isn't available
            const lines = csvText.toString().split(/\r\n|\n/);
            const headers = lines[0].split(',').map(h => h.trim());
            
            console.log('CSV Headers detected:', headers);
            
            jsonData = lines.slice(1).map(line => {
              if (!line.trim()) return null; // Skip empty lines
              
              const values = line.split(',');
              const obj = {};
              
              headers.forEach((header, i) => {
                // Clean up header name and use it as key
                const key = header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                obj[key] = values[i] ? values[i].trim() : '';
              });
              
              return obj;
            }).filter(item => item !== null);
            
          } catch (csvError) {
            console.error('Error parsing CSV:', csvError);
            throw new Error('Failed to parse CSV file. Please check the format.');
          }
        } else {
          // Handle Excel file
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        }
        
        if (jsonData.length === 0) {
          alert('No data found in the file');
          return;
        }
        
        console.log('Raw imported data (first row):', jsonData[0]);
        
        // Extract column keys from the first row
        const sampleKeys = Object.keys(jsonData[0]);
        console.log('Available keys in data:', sampleKeys);
        
        // Create a mapping from file columns to our expected columns
        const findKey = (possibleNames) => {
          return sampleKeys.find(key => 
            possibleNames.some(name => 
              key.toLowerCase().includes(name.toLowerCase())
            )
          );
        };
        
        const columnMap = {
          date: findKey(['date', 'day', 'time']),
          partsNumber: findKey(['partsnumber', 'partnumber', 'part number', 'parts number', 'partno', 'partnumbered']),
          partsName: findKey(['partsname', 'partname', 'parts name', 'part name', 'description', 'item']),
          component: findKey(['component', 'category', 'type']),
          quantity: findKey(['quantity', 'qty', 'count']),
          itemPrice: findKey(['itemprice', 'item price', 'price', 'cost', 'unitprice']),
          rack: findKey(['rack', 'location', 'position']),
          tax: findKey(['tax', 'vat', 'gst']),
          totalAmount: findKey(['totalamount', 'total amount', 'total', 'amount']),
          pic: findKey(['pic', 'person', 'responsible']),
          poNumber: findKey(['ponumber', 'po number', 'purchase order']),
          ctplNumber: findKey(['ctplnumber', 'ctpl number', 'ctpl'])
        };
        
        console.log('Column mapping:', columnMap);
        
        // Transform data to match inventory item structure
        const importedItems = jsonData.map(row => {
          // Generate a unique ID for each item
          const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).substr(2, 9);
          
          // Helper to safely get a value with fallback
          const getValue = (field, defaultValue = '') => {
            if (!columnMap[field]) return defaultValue;
            const value = row[columnMap[field]];
            return value !== undefined && value !== null ? value : defaultValue;
          };
          
          // Handle numeric values
          const getNumber = (field, defaultValue = 0) => {
            const value = getValue(field, '');
            if (value === '') return defaultValue;
            
            // Remove any non-numeric characters except decimal point
            const numStr = value.toString().replace(/[^0-9.-]/g, '');
            const num = parseFloat(numStr);
            return isNaN(num) ? defaultValue : num;
          };
          
          // Get date and format it
          let dateValue = getValue('date', new Date().toISOString().split('T')[0]);
          
          return {
            id,
            date: dateValue,
            partsNumber: getValue('partsNumber'),
            partsName: getValue('partsName'),
            component: getValue('component'),
            quantity: parseInt(getNumber('quantity')),
            itemPrice: getNumber('itemPrice'),
            imageData: null,
            rack: getValue('rack'),
            tax: getNumber('tax'),
            totalAmount: getNumber('totalAmount'),
            pic: getValue('pic'),
            poNumber: getValue('poNumber'),
            ctplNumber: getValue('ctplNumber')
          };
        });
        
        // Filter out rows with empty essential data
        const validItems = importedItems.filter(item => 
          (item.partsNumber && item.partsNumber.trim() !== '') || 
          (item.partsName && item.partsName.trim() !== '')
        );
        
        if (validItems.length === 0) {
          alert('No valid inventory items found in the file. Please check your data format.');
          return;
        }
        
        console.log(`Processing ${validItems.length} valid items from ${jsonData.length} total rows`);
        console.log('First item to import:', validItems[0]);
        
        // Add items to inventory through context
        importItemsToInventory(validItems);
        alert(`Successfully imported ${validItems.length} items to inventory!`);
      };
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('Error importing file:', error);
      alert(`Import error: ${error.message}\n\nPlease check your file format and try again.`);
    }
    
    // Reset the file input
    event.target.value = null;
  };
  
  // Trigger file input click
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Function for capturing and analyzing the current camera frame - optimized version
   */
  const captureAndAnalyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      setCapturingImage(true);
      setScanError('');
      
      // Draw current video frame to canvas at full resolution for capture
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to image at higher quality for analysis
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      // Update UI with captured image
      setUploadedImage({
        src: imageDataUrl,
        width: canvas.width,
        height: canvas.height
      });
      
      // If we already have high-confidence real-time results, use them immediately
      if (realtimeResults && realtimeResults.partsNumber) {
        setScanResult(realtimeResults);
        setScanFormData(prev => ({
          ...prev,
          partsNumber: realtimeResults.partsNumber,
          partsName: realtimeResults.partsName || '',
          component: realtimeResults.component || prev.component
        }));
        
        setScanning(false);
        setCapturingImage(false);
        setRealtimeScanning(false); // Stop real-time scanning after successful capture
        return;
      }
      
      // Otherwise, run full OCR
      setScanning(true);
      
      // Use the optimized scanner
      scanHyundaiPartLabel(imageDataUrl)
        .then(result => {
          if (result.success) {
            setScanResult(result.result);
            setScanFormData(prev => ({
              ...prev,
              partsNumber: result.result.partsNumber,
              partsName: result.result.partsName,
              component: result.result.component
            }));
            
            if (result.warning) {
              setScanError(result.warning);
            } else {
              setScanError('');
            }
          } else {
            setScanError(result.error || 'Could not detect part information. Please try again or enter manually.');
          }
        })
        .catch(error => {
          console.error('Error in OCR processing:', error);
          setScanError('Error during image processing. Please try again.');
        })
        .finally(() => {
          setScanning(false);
          setCapturingImage(false);
          setRealtimeScanning(false); // Stop real-time scanning after capture
        });
        
    } catch (err) {
      console.error('Error capturing image:', err);
      setScanError('Error capturing image. Please try again.');
      setScanning(false);
      setCapturingImage(false);
    }
  };

  /**
   * Function for handling image upload
   */
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Only accept images
    if (!file.type.match('image.*')) {
      setScanError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        // Get dimensions
        const img = new Image();
        img.onload = () => {
          setUploadedImage({
            src: e.target.result,
            width: img.width,
            height: img.height
          });
          
          // Start OCR
          setScanning(true);
          
          scanHyundaiPartLabel(e.target.result)
            .then(result => {
              if (result.success) {
                setScanResult(result.result);
                setScanFormData(prev => ({
                  ...prev,
                  partsNumber: result.result.partsNumber,
                  partsName: result.result.partsName,
                  component: result.result.component
                }));
                
                if (result.warning) {
                  setScanError(result.warning);
                } else {
                  setScanError('');
                }
              } else {
                setScanError(result.error || 'Could not detect part information. Please try again or enter manually.');
              }
            })
            .catch(error => {
              console.error('Error in OCR processing:', error);
              setScanError('Error during image processing. Please try again.');
            })
            .finally(() => {
              setScanning(false);
            });
        };
        
        img.src = e.target.result;
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setScanError('Failed to read the image file. Please try again.');
      setScanning(false);
    }
    
    // Reset input
    event.target.value = null;
  };

  /**
   * Start camera for scanning with optimized real-time processing
   */
  const startScanner = async () => {
    setScannerActive(true);
    setScanError('');
    setScanning(false);
    setCapturingImage(false);
    setRealtimeScanning(true);
    setRealtimeResults(null);
    setScannerReady(false);
    
    try {
      // First try to use selected camera with best quality constraints
      let stream;
      
      try {
        if (selectedCamera) {
          // If specific camera selected, use it with HD resolution if possible
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: selectedCamera },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "environment"
            }
          });
        } else {
          // Try to get the back/environment camera first
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        }
      } catch (exactConstraintError) {
        console.log('Failed with ideal constraint, using fallback options...');
        
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true); // required for iOS
        
        // Start real-time scanning once video is ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          
          // Short delay to let camera stabilize
          setTimeout(() => {
            setScannerReady(true);
            
            // Start real-time scanning using the optimized function
            const animationId = startRealtimeScanning(
              videoRef, 
              canvasRef, 
              setRealtimeResults, 
              setProcessingFrame, 
              realtimeScanning, 
              true, // Ready
              scannerFPS
            );
            
            // Store animation ID for cleanup
            animationRef.current = animationId;
          }, 800);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setScanError('Could not access camera. Please ensure camera permissions are granted or try uploading an image instead.');
      setRealtimeScanning(false);
      setScannerReady(false);
    }
  };

  /**
   * Stop scanner and clean up resources
   */
  const stopScanner = () => {
    setScannerActive(false);
    setRealtimeScanning(false);
    setScannerReady(false);
    
    // Cancel any ongoing animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop the video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Retry scanning/capturing
  const handleRetry = () => {
    setScanResult(null);
    setUploadedImage(null);
    setScanning(false);
    setCapturingImage(false);
    setScanError('');
    startScanner(); // Restart scanner on retry
  };

  // Handle scan form changes
  const handleScanFormChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...scanFormData,
      [name]: value
    };
    
    // Recalculate total amount when price or quantity changes
    if (name === 'itemPrice' || name === 'quantity' || name === 'tax') {
      const price = parseFloat(name === 'itemPrice' ? value : updatedFormData.itemPrice) || 0;
      const quantity = parseInt(name === 'quantity' ? value : updatedFormData.quantity) || 1;
      const tax = parseFloat(name === 'tax' ? value : updatedFormData.tax) || 0;
      
      // Calculate subtotal and add tax
      const subtotal = price * quantity;
      const taxAmount = subtotal * (tax / 100);
      updatedFormData.totalAmount = subtotal + taxAmount;
    }
    
    setScanFormData(updatedFormData);
  };

  // Handle adding scanned item to inventory
  const handleAddScannedItem = () => {
    // Validate required fields
    if (!scanFormData.partsNumber || !scanFormData.partsName) {
      setScanError('Parts Number and Parts Name are required');
      return;
    }
    
    // Calculate total amount with tax
    const price = parseFloat(scanFormData.itemPrice) || 0;
    const quantity = parseInt(scanFormData.quantity) || 1;
    const tax = parseFloat(scanFormData.tax) || 0;
    const subtotal = price * quantity;
    const taxAmount = subtotal * (tax / 100);
    const totalAmount = subtotal + taxAmount;
    
    // Create a new item with the scanned/entered data
    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36).substr(2, 9),
      date: scanFormData.date,
      partsNumber: scanFormData.partsNumber,
      partsName: scanFormData.partsName,
      component: scanFormData.component,
      quantity: quantity,
      itemPrice: price,
      imageData: uploadedImage ? uploadedImage.src : null,
      rack: scanFormData.rack,
      tax: tax,
      totalAmount: totalAmount,
      pic: scanFormData.pic,
      poNumber: scanFormData.poNumber,
      ctplNumber: scanFormData.ctplNumber
    };
    
    // Add to inventory
    importItemsToInventory([newItem]);
    
    // Reset form and close modal
    setScanFormData({
      partsNumber: '',
      partsName: '',
      component: '',
      quantity: 1,
      itemPrice: '',
      date: new Date().toISOString().split('T')[0],
      tax: 0,
      rack: '',
      pic: '',
      poNumber: '',
      ctplNumber: '',
    });
    setScanResult(null);
    setUploadedImage(null);
    setShowScanItemModal(false);
  };

  // Handle scan item button click
  const handleScanItemClick = () => {
    setShowScanItemModal(true);
    setScanError('');
    setScanResult(null);
    setUploadedImage(null);
    setScanning(false);
    setCapturingImage(false);
    startScanner(); // Automatically start the camera
  };

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  return (
    <div className="content-section inventory-section">
      <div className="inventory-actions-top">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Search Item" 
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="action-buttons">
          <button className="action-btn add-btn" onClick={handleAddItem}>
            <i className="fas fa-plus"></i> Add Item
          </button>
          <button className="action-btn excel-btn" onClick={handleExportToExcel}>
            <i className="fas fa-file-excel"></i> Make Excel
          </button>
          <button className="action-btn import-btn" onClick={handleImportClick}>
            <i className="fas fa-file-upload"></i> Import Excel
          </button>
          {/* Add Scan Item button */}
          <button className="action-btn scan-btn" onClick={handleScanItemClick}>
            <i className="fas fa-barcode"></i> Scan Item
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx, .xls, .csv"
            onChange={handleImportFromExcel}
          />
          <button 
            className={`action-btn filter-btn ${filters.isFiltered ? 'active' : ''}`} 
            onClick={handleFilterClick}
          >
            <i className="fas fa-filter"></i> Filter
            {filters.isFiltered && <span className="filter-badge"></span>}
          </button>
        </div>
      </div>
      
      {/* Optimized Scan Item Modal */}
      {showScanItemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3><i className="fas fa-barcode"></i> Scan Hyundai Part Label</h3>
              <button 
                className="close-button" 
                onClick={() => {
                  setShowScanItemModal(false);
                  stopScanner();
                }}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <div className="scanner-instructions">
                <p><i className="fas fa-info-circle"></i> Position the Hyundai part label in the center frame</p>
                <p className="scanner-tip">For best results, ensure good lighting and hold the camera steady</p>
              </div>
              
              {/* Camera selection if multiple cameras */}
              {videoDevices.length > 1 && (
                <div className="camera-selection">
                  <label>Select Camera:</label>
                  <select 
                    value={selectedCamera} 
                    onChange={handleCameraChange}
                    className="camera-select"
                  >
                    {videoDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {!scanResult && !uploadedImage && (
                <div className="scanner-container">
                  {/* Real-time detection results */}
                  {realtimeResults && realtimeResults.partsNumber && (
                    <div className="realtime-results">
                      <div className="realtime-badge">
                        <i className="fas fa-check-circle"></i> Part Detected
                      </div>
                      <div className="realtime-info">
                        <div><strong>Part Number:</strong> {realtimeResults.partsNumber}</div>
                        {realtimeResults.partsName && (
                          <div><strong>Part Name:</strong> {realtimeResults.partsName}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Video Element */}
                  <video 
                    ref={videoRef} 
                    className="scanner-video"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  ></video>
                  <canvas 
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  ></canvas>
                  
                  {/* Enhanced Scanning frame - properly centered */}
                  <div className="scanner-frame">
                    {/* Animated laser for visual feedback */}
                    <div className="scanner-laser"></div>
                    
                    <div className="scanner-horizontal-line top"></div>
                    <div className="scanner-horizontal-line bottom"></div>
                    <div className="scanner-vertical-line left"></div>
                    <div className="scanner-vertical-line right"></div>
                    
                    <div className="corner top-left"></div>
                    <div className="corner top-right"></div>
                    <div className="corner bottom-left"></div>
                    <div className="corner bottom-right"></div>
                  </div>
                  
                  {/* Status indicator */}
                  {!scannerReady && (
                    <div className="camera-loading">
                      <div className="spinner"></div>
                      <p>Initializing camera...</p>
                    </div>
                  )}
                  
                  {scannerReady && processingFrame && !realtimeResults && (
                    <div className="scanner-status processing">
                      <span className="scanning-indicator">
                        <i className="fas fa-sync fa-spin"></i> Scanning...
                      </span>
                    </div>
                  )}
                  
                  {/* Improved Capture button */}
                  <button 
                    className={`capture-btn ${realtimeResults ? 'ready' : ''}`}
                    onClick={captureAndAnalyzeFrame}
                    disabled={capturingImage || !scannerReady}
                  >
                    <i className={`fas ${capturingImage ? 'fa-spinner fa-spin' : 'fa-camera'}`}></i>
                  </button>
                </div>
              )}
              
              {/* Uploaded image preview */}
              {uploadedImage && (
                <div className="uploaded-image-container">
                  <img 
                    src={uploadedImage.src} 
                    alt="Captured label" 
                    className="uploaded-barcode-image"
                  />
                  
                  {/* Scanning indicator */}
                  {scanning && (
                    <div className="analyzing-badge">
                      <span className="analyzing-badge-text">
                        <i className="fas fa-sync fa-spin"></i> Analyzing label...
                      </span>
                    </div>
                  )}
                  
                  {/* Success indicator */}
                  {scanResult && !scanning && (
                    <div className="analyzing-badge">
                      <span className="success-badge">
                        <i className="fas fa-check-circle"></i> Part identified!
                      </span>
                    </div>
                  )}
                  
                  {/* Retry/new capture button */}
                  {!scanning && (
                    <button 
                      className="retry-btn"
                      onClick={handleRetry}
                    >
                      <i className="fas fa-redo"></i> New Capture
                    </button>
                  )}
                </div>
              )}
              
              {scanError && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i> {scanError}
                </div>
              )}
              
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                {/* Optional: Image upload button */}
                {!uploadedImage && (
                  <button 
                    className="btn btn-light upload-image-btn"
                    onClick={() => document.getElementById('upload-image-input').click()}
                  >
                    <i className="fas fa-file-upload"></i> Upload Label Image
                  </button>
                )}
                <input 
                  id="upload-image-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </div>
              
              {/* Form fields shown when there's a scan result */}
              {scanResult && (
                <div className="manual-entry-form">
                  <h4>Scanned Part Details</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date</label>
                      <input 
                        type="date" 
                        name="date" 
                        value={scanFormData.date}
                        onChange={handleScanFormChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Parts Number <span className="required">*</span></label>
                      <input 
                        type="text" 
                        name="partsNumber" 
                        value={scanFormData.partsNumber}
                        onChange={handleScanFormChange}
                        placeholder="Enter parts number"
                        className={scanError && !scanFormData.partsNumber ? 'error' : ''}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Parts Name <span className="required">*</span></label>
                    <input 
                      type="text" 
                      name="partsName" 
                      value={scanFormData.partsName}
                      onChange={handleScanFormChange}
                      placeholder="Enter parts name"
                      className={scanError && !scanFormData.partsName ? 'error' : ''}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Component</label>
                      <select 
                        name="component" 
                        value={scanFormData.component}
                        onChange={handleScanFormChange}
                      >
                        <option value="">Select component</option>
                        {componentCategories.map(component => (
                          <option key={component} value={component}>
                            {component}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input 
                        type="number" 
                        name="quantity" 
                        value={scanFormData.quantity}
                        onChange={handleScanFormChange}
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Item Price</label>
                      <input 
                        type="number" 
                        name="itemPrice" 
                        value={scanFormData.itemPrice}
                        onChange={handleScanFormChange}
                        step="0.01"
                        placeholder="Enter price"
                      />
                    </div>
                    <div className="form-group">
                      <label>Rack</label>
                      <input 
                        type="text" 
                        name="rack" 
                        value={scanFormData.rack}
                        onChange={handleScanFormChange}
                        placeholder="Enter rack location"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tax</label>
                      <input 
                        type="number" 
                        name="tax" 
                        value={scanFormData.tax}
                        onChange={handleScanFormChange}
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Person in Charge</label>
                      <input 
                        type="text" 
                        name="pic" 
                        value={scanFormData.pic}
                        onChange={handleScanFormChange}
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>PO Number</label>
                      <input 
                        type="text" 
                        name="poNumber" 
                        value={scanFormData.poNumber}
                        onChange={handleScanFormChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>CTPL Number</label>
                      <input 
                        type="text" 
                        name="ctplNumber" 
                        value={scanFormData.ctplNumber}
                        onChange={handleScanFormChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-light" 
                onClick={() => {
                  setShowScanItemModal(false);
                  stopScanner();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddScannedItem}
                disabled={!scanFormData.partsNumber || !scanFormData.partsName}
              >
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Filter Modal */}
      {showFilterModal && (
        <div className="modal-overlay">
          <div className="filter-modal">
            <div className="filter-modal-header">
              <h3><i className="fas fa-filter"></i> Filter Inventory</h3>
              <button className="close-btn" onClick={() => setShowFilterModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="filter-modal-body">
              {/* Date Range Filter */}
              <div className="filter-section">
                <h4><i className="far fa-calendar-alt"></i> Date Range</h4>
                <div className="filter-inputs">
                  <div className="filter-input-group">
                    <label>From</label>
                    <input 
                      type="date" 
                      value={filters.dateRange.start}
                      onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                    />
                  </div>
                  <div className="filter-input-group">
                    <label>To</label>
                    <input 
                      type="date" 
                      value={filters.dateRange.end}
                      onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Price Range Filter */}
              <div className="filter-section">
                <h4><i className="fas fa-tag"></i> Price Range</h4>
                <div className="filter-inputs">
                  <div className="filter-input-group">
                    <label>Min Price</label>
                    <input 
                      type="number" 
                      placeholder="Enter minimum price" 
                      value={filters.priceRange.min}
                      onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                    />
                  </div>
                  <div className="filter-input-group">
                    <label>Max Price</label>
                    <input 
                      type="number" 
                      placeholder="Enter maximum price" 
                      value={filters.priceRange.max}
                      onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Quantity Range Filter */}
              <div className="filter-section">
                <h4><i className="fas fa-box"></i> Quantity Range</h4>
                <div className="filter-inputs">
                  <div className="filter-input-group">
                    <label>Min Quantity</label>
                    <input 
                      type="number" 
                      placeholder="Enter minimum quantity" 
                      value={filters.quantityRange.min}
                      onChange={(e) => handleFilterChange('quantityMin', e.target.value)}
                    />
                  </div>
                  <div className="filter-input-group">
                    <label>Max Quantity</label>
                    <input 
                      type="number" 
                      placeholder="Enter maximum quantity" 
                      value={filters.quantityRange.max}
                      onChange={(e) => handleFilterChange('quantityMax', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Component Filter */}
              <div className="filter-section">
                <h4><i className="fas fa-cogs"></i> Components</h4>
                <div className="component-checkboxes">
                  {componentCategories.map((component, index) => (
                    <div key={index} className="component-checkbox">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={filters.components.includes(component)}
                          onChange={() => handleFilterChange('component', component)}
                        />
                        <span>{component}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="filter-modal-footer">
              <button className="btn secondary-btn" onClick={clearFilters}>
                <i className="fas fa-times-circle"></i> Clear Filters
              </button>
              <button className="btn primary-btn" onClick={applyFilters}>
                <i className="fas fa-check-circle"></i> Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="card inventory-card">
        {/* Filter indicator */}
        {filters.isFiltered && (
          <div className="active-filters">
            <span><i className="fas fa-filter"></i> Active Filters:</span>
            {(filters.dateRange.start && filters.dateRange.end) && (
              <div className="filter-tag">
                <i className="far fa-calendar-alt"></i>
                {new Date(filters.dateRange.start).toLocaleDateString()} - {new Date(filters.dateRange.end).toLocaleDateString()}
                <button onClick={() => setFilters({...filters, dateRange: {start: '', end: ''}})}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
            {(filters.priceRange.min || filters.priceRange.max) && (
              <div className="filter-tag">
                <i className="fas fa-tag"></i>
                {filters.priceRange.min ? formatPeso(filters.priceRange.min) : '₱0'} - {filters.priceRange.max ? formatPeso(filters.priceRange.max) : 'Any'}
                <button onClick={() => setFilters({...filters, priceRange: {min: '', max: ''}})}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
            {(filters.quantityRange.min || filters.quantityRange.max) && (
              <div className="filter-tag">
                <i className="fas fa-box"></i>
                {filters.quantityRange.min || '0'} - {filters.quantityRange.max || 'Any'}
                <button onClick={() => setFilters({...filters, quantityRange: {min: '', max: ''}})}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
            {filters.components.length > 0 && (
              <div className="filter-tag">
                <i className="fas fa-cogs"></i>
                {filters.components.join(', ')}
                <button onClick={() => setFilters({...filters, components: []})}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
            <button className="clear-all-btn" onClick={clearFilters}>
              <i className="fas fa-trash-alt"></i> Clear All
            </button>
          </div>
        )}
        
        <div className="inventory-table-container">
          <table className="inventory-table">
            <colgroup>
              <col className="checkbox-column" />
              <col className="date-column" />
              <col className="parts-number-column" />
              <col className="parts-name-column" />
              <col className="component-column" />
              <col className="quantity-column" />
              <col className="price-column" />
              <col className="image-column" />
              <col className="action-column" />
            </colgroup>
            <thead>
              <tr>
                <th className="checkbox-column">
                  <input 
                    type="checkbox" 
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="date-column">Date <i className="fas fa-sort"></i></th>
                <th className="parts-number-column">Parts Number</th>
                <th className="parts-name-column">Parts Name</th>
                <th className="component-column">Component</th>
                <th className="quantity-column">Quantity</th>
                <th className="price-column">Item Price</th>
                <th className="image-column">Image</th>
                <th className="action-column">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map(item => (
                  <tr key={item.id}>
                    <td className="checkbox-column">
                      <input 
                        type="checkbox" 
                        checked={selectedRows.includes(item.id)}
                        onChange={() => handleRowSelect(item.id)}
                      />
                    </td>
                    <td className="date-column">{item.date}</td>
                    <td className="parts-number-column">{item.partsNumber}</td>
                    <td className="parts-name-column">{item.partsName}</td>
                    <td className="component-column">{item.component}</td>
                    <td className="quantity-column">{item.quantity}</td>
                    <td className="price-column">{formatPeso(item.itemPrice)}</td>
                    <td className="image-column">
                      <div className="image-cell">
                        {item.imageData ? (
                          <img 
                            src={item.imageData} 
                            alt={item.partsName}
                          />
                        ) : (
                          <i className="fas fa-image" style={{ color: '#aaa' }}></i>
                        )}
                      </div>
                    </td>
                    <td className="action-column">
                      <div className="action-cell">
                        <button 
                          className="icon-btn view-btn"
                          onClick={() => handleViewItem(item)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="icon-btn edit-btn"
                          onClick={() => handleEditItem(item)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="icon-btn delete-btn"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                    {searchTerm || filters.isFiltered ? 'No items match your search or filters.' : 'No inventory items available. Add an item to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="pagination-container">
          <div className="showing-info">
            <span>Showing</span>
            <select 
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="records-info">
            <span>
              {filteredItems.length > 0 
                ? `Showing ${indexOfFirstItem + 1} to ${Math.min(indexOfLastItem, filteredItems.length)} out of ${filteredItems.length} records` 
                : 'No records to show'}
            </span>
          </div>
          <div className="pagination-controls">
            <button 
              className="pagination-btn prev-btn" 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            {/* Generate page buttons */}
            {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => {
              // If we have 4 or fewer pages, show all page numbers
              let pageNum = i + 1;
              
              // If we have more than 4 pages and we're not on the first or last pages
              if (totalPages > 4 && currentPage > 2 && currentPage < totalPages - 1) {
                // Show current page and surrounding pages
                pageNum = currentPage - 1 + i;
                // Ensure we don't exceed the total pages
                if (pageNum > totalPages) {
                  return null;
                }
              } else if (totalPages > 4 && currentPage >= totalPages - 1) {
                // If we're on one of the last two pages, show the last 4 pages
                pageNum = totalPages - 3 + i;
              }
              
              return (
                <button 
                  key={pageNum}
                  className={`pagination-btn page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button 
              className="pagination-btn next-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
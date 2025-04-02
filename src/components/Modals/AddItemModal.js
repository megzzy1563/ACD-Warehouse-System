// src/components/Modals/AddItemModal.js
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import '../../styles/ModalStyles.css';
import DatePicker from '../common/DatePicker';

const AddItemModal = () => {
  const { 
    showAddItemModal, 
    setShowAddItemModal, 
    addInventoryItem, 
    updateInventoryItem,
    selectedItem 
  } = useContext(AppContext);
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  
  // Determine if we're in edit mode
  const isEditMode = !!selectedItem;
  
  // State for form data
  const [formData, setFormData] = useState({
    component: '',
    partsName: '',
    partsNumber: '',
    pic: '',
    quantity: 1,
    rack: '',
    date: new Date().toISOString().slice(0, 10),
    dateDisplay: formatDateForDisplay(new Date()),
    itemPrice: 0,
    tax: 0,
    totalAmount: 0,
    poNumber: '',
    ctplNumber: ''
  });
  
  // State for image data and validation errors
  const [uploadedImageData, setUploadedImageData] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Format date for display (DD/MM/YYYY)
  function formatDateForDisplay(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Set up animation and load form data
  useEffect(() => {
    if (showAddItemModal) {
      // Small delay for animation to work properly
      setTimeout(() => setIsVisible(true), 50);
      
      if (selectedItem) {
        // Convert date from DD/MM/YYYY to YYYY-MM-DD for the input if needed
        let dateValue = selectedItem.date;
        if (selectedItem.date && selectedItem.date.includes('/')) {
          const [day, month, year] = selectedItem.date.split('/');
          dateValue = `${year}-${month}-${day}`;
        }
        
        setFormData({
          component: selectedItem.component || '',
          partsName: selectedItem.partsName || '',
          partsNumber: selectedItem.partsNumber || '',
          pic: selectedItem.pic || '',
          quantity: selectedItem.quantity || 1,
          rack: selectedItem.rack || '',
          date: dateValue,
          dateDisplay: selectedItem.date || formatDateForDisplay(new Date()),
          itemPrice: selectedItem.itemPrice || 0,
          tax: selectedItem.tax || 0,
          totalAmount: selectedItem.totalAmount || 0,
          poNumber: selectedItem.poNumber || '',
          ctplNumber: selectedItem.ctplNumber || ''
        });
        
        setUploadedImageData(selectedItem.imageData || null);
      } else {
        // Reset form for new item
        resetForm();
      }
    } else {
      setIsVisible(false);
    }
  }, [showAddItemModal, selectedItem]);
  
  // Close modal with fade-out effect
  const closeModal = () => {
    setIsVisible(false);
    setTimeout(() => setShowAddItemModal(false), 300);
  };
  
  // Handle input changes
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
    
    // Clear error for this field if it exists
    if (errors[id]) {
      setErrors({
        ...errors,
        [id]: null
      });
    }
    
    // Recalculate total amount when price, quantity, or tax changes
    if (id === 'itemPrice' || id === 'quantity' || id === 'tax') {
      calculateTotal();
    }
  };
  
  // Calculate total amount
  const calculateTotal = () => {
    const price = parseFloat(formData.itemPrice) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const quantity = parseInt(formData.quantity) || 1;
    
    const total = (price * quantity) + tax;
    
    setFormData(prev => ({
      ...prev,
      totalAmount: total.toFixed(2)
    }));
  };
  
  // Handle date change from DatePicker component
  const handleDateChange = (dateStr) => {
    // DatePicker returns date in DD/MM/YYYY format
    if (dateStr) {
      const [day, month, year] = dateStr.split('/');
      const isoDate = `${year}-${month}-${day}`;
      
      setFormData({
        ...formData,
        date: isoDate,
        dateDisplay: dateStr
      });
      
      // Clear error if exists
      if (errors.date) {
        setErrors({
          ...errors,
          date: null
        });
      }
    }
  };
  
  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.match('image.*')) {
        setErrors({
          ...errors,
          image: 'Please select a valid image file'
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({
          ...errors,
          image: 'Image size must be less than 5MB'
        });
        return;
      }
      
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageData(event.target.result);
      };
      reader.readAsDataURL(file);
      
      // Clear error if exists
      if (errors.image) {
        setErrors({
          ...errors,
          image: null
        });
      }
    }
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      component: '',
      partsName: '',
      partsNumber: '',
      pic: '',
      quantity: 1,
      rack: '',
      date: new Date().toISOString().slice(0, 10),
      dateDisplay: formatDateForDisplay(new Date()),
      itemPrice: 0,
      tax: 0,
      totalAmount: 0,
      poNumber: '',
      ctplNumber: ''
    });
    setUploadedImageData(null);
    setErrors({});
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.component) newErrors.component = 'Component is required';
    if (!formData.partsName) newErrors.partsName = 'Parts Name is required';
    if (!formData.partsNumber) newErrors.partsNumber = 'Parts Number is required';
    if (!formData.pic) newErrors.pic = 'PIC is required';
    if (!formData.rack) newErrors.rack = 'Rack is required';
    if (!formData.poNumber) newErrors.poNumber = 'PO Number is required';
    if (!formData.ctplNumber) newErrors.ctplNumber = 'CTPL Number is required';
    
    // Numeric validations
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    
    const itemPrice = parseFloat(formData.itemPrice);
    if (isNaN(itemPrice) || itemPrice < 0) {
      newErrors.itemPrice = 'Price must be a valid number';
    }
    
    const tax = parseFloat(formData.tax);
    if (isNaN(tax) || tax < 0) {
      newErrors.tax = 'Tax must be a valid number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
// Change any reference from id to _id when interacting with the backend
const handleSubmit = () => {
  if (!validateForm()) return;
  
  // Create item object
  const itemData = {
    ...formData,
    imageData: uploadedImageData,
    _id: selectedItem ? selectedItem._id : undefined // Include _id for updates
  };
  
  // Add or update item
  if (isEditMode) {
    updateInventoryItem(itemData);
  } else {
    addInventoryItem(itemData);
  }
  
  // Close modal
  closeModal();
};
  
  // If modal is not shown, don't render anything
  if (!showAddItemModal) return null;

  return (
    <div className={`modal-overlay ${isVisible ? 'visible' : ''}`} onClick={closeModal}>
      <div 
        className={`modal-content-enhanced ${isVisible ? 'visible' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <div className="modal-header-enhanced">
          <h3>
            <i className={isEditMode ? "fas fa-edit" : "fas fa-plus-circle"}></i> 
            {isEditMode ? 'Edit Item' : 'Add New Item'}
          </h3>
          <button className="close-button-enhanced" onClick={closeModal}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body-enhanced">
          <div className="form-container">
            {/* Image Upload Section */}
            <div className="image-upload-section">
              <div 
                className="item-image-upload-container"
                onClick={() => document.getElementById('imageUpload').click()}
              >
                {uploadedImageData ? (
                  <img 
                    src={uploadedImageData} 
                    alt="Item Preview" 
                    className="item-image-preview"
                  />
                ) : (
                  <div className="item-image-placeholder">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <span>Upload Image</span>
                  </div>
                )}
                <div className="image-upload-overlay">
                  <i className="fas fa-camera"></i>
                </div>
                <input 
                  type="file" 
                  id="imageUpload" 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </div>
              {errors.image && <div className="error-message">{errors.image}</div>}
              <div className="image-upload-caption">Click to browse or drop an image</div>
            </div>
            
            {/* Form Fields */}
            <div className="form-grid">
              {/* Basic Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <i className="fas fa-info-circle"></i>
                  <h4>Basic Information</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="component">
                      Component <span className="required">*</span>
                    </label>
                    <div className="select-container">
                      <select 
                        id="component" 
                        value={formData.component}
                        onChange={handleChange}
                        className={errors.component ? 'error' : ''}
                      >
                        <option value="" disabled>Choose Type</option>
                        <option value="Engine">Engine</option>
                        <option value="Hydraulic">Hydraulic</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Body">Body</option>
                      </select>
                      <i className="fas fa-chevron-down"></i>
                    </div>
                    {errors.component && <div className="error-message">{errors.component}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="partsName">
                      Parts Name <span className="required">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="partsName" 
                      placeholder="Enter item name" 
                      value={formData.partsName}
                      onChange={handleChange}
                      className={errors.partsName ? 'error' : ''}
                    />
                    {errors.partsName && <div className="error-message">{errors.partsName}</div>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="partsNumber">
                      Parts Number <span className="required">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="partsNumber" 
                      placeholder="Enter serial number" 
                      value={formData.partsNumber}
                      onChange={handleChange}
                      className={errors.partsNumber ? 'error' : ''}
                    />
                    {errors.partsNumber && <div className="error-message">{errors.partsNumber}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="pic">
                      PIC <span className="required">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="pic" 
                      placeholder="Enter PIC" 
                      value={formData.pic}
                      onChange={handleChange}
                      className={errors.pic ? 'error' : ''}
                    />
                    {errors.pic && <div className="error-message">{errors.pic}</div>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="quantity">
                      Quantity <span className="required">*</span>
                    </label>
                    <input 
                      type="number" 
                      id="quantity" 
                      placeholder="Enter quantity" 
                      min="1" 
                      value={formData.quantity}
                      onChange={handleChange}
                      className={errors.quantity ? 'error' : ''}
                    />
                    {errors.quantity && <div className="error-message">{errors.quantity}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="rack">
                      Rack <span className="required">*</span>
                    </label>
                    <div className="select-container">
                      <select 
                        id="rack" 
                        value={formData.rack}
                        onChange={handleChange}
                        className={errors.rack ? 'error' : ''}
                      >
                        <option value="" disabled>Choose Rack</option>
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C1">C1</option>
                      </select>
                      <i className="fas fa-chevron-down"></i>
                    </div>
                    {errors.rack && <div className="error-message">{errors.rack}</div>}
                  </div>
                </div>
              </div>
              
              {/* Financial Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <i className="fas fa-dollar-sign"></i>
                  <h4>Financial Information</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="itemPrice">
                      Item Price <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="number" 
                        id="itemPrice" 
                        placeholder="Enter price" 
                        min="0" 
                        step="0.01" 
                        value={formData.itemPrice}
                        onChange={handleChange}
                        className={errors.itemPrice ? 'error' : ''}
                      />
                      <div className="input-icon-container">
                        <span className="input-icon">₱</span>
                      </div>
                    </div>
                    {errors.itemPrice && <div className="error-message">{errors.itemPrice}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="tax">
                      Tax <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="number" 
                        id="tax" 
                        placeholder="Enter tax" 
                        min="0" 
                        step="0.01" 
                        value={formData.tax}
                        onChange={handleChange}
                        className={errors.tax ? 'error' : ''}
                      />
                      <div className="input-icon-container">
                        <span className="input-icon">₱</span>
                      </div>
                    </div>
                    {errors.tax && <div className="error-message">{errors.tax}</div>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="totalAmount">
                      Total Amount <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="number" 
                        id="totalAmount" 
                        placeholder="Total amount" 
                        value={formData.totalAmount}
                        readOnly
                        className="readonly-input"
                      />
                      <div className="input-icon-container">
                        <span className="input-icon">₱</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="date">
                      Date <span className="required">*</span>
                    </label>
                    <div className="date-input-container">
                      <DatePicker 
                        id="date"
                        value={formData.dateDisplay}
                        onChange={handleDateChange}
                        placeholder="DD/MM/YYYY"
                        className={errors.date ? 'error' : ''}
                        customInput={
                          <div className="date-input-wrapper">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              value={formData.dateDisplay}
                              readOnly
                              className={errors.date ? 'error' : ''}
                            />
                            <div className="input-icon-container">
                              <i className="fas fa-calendar-alt"></i>
                            </div>
                          </div>
                        }
                      />
                    </div>
                    {errors.date && <div className="error-message">{errors.date}</div>}
                  </div>
                </div>
              </div>
              
              {/* Additional Information Section */}
              <div className="form-section full-width">
                <div className="section-header">
                  <i className="fas fa-clipboard-list"></i>
                  <h4>Additional Information</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="poNumber">
                      PO Number <span className="required">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="poNumber" 
                      placeholder="Enter PO No." 
                      value={formData.poNumber}
                      onChange={handleChange}
                      className={errors.poNumber ? 'error' : ''}
                    />
                    {errors.poNumber && <div className="error-message">{errors.poNumber}</div>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="ctplNumber">
                      CTPL Number <span className="required">*</span>
                    </label>
                    <input 
                      type="text" 
                      id="ctplNumber" 
                      placeholder="Enter CTPL No." 
                      value={formData.ctplNumber}
                      onChange={handleChange}
                      className={errors.ctplNumber ? 'error' : ''}
                    />
                    {errors.ctplNumber && <div className="error-message">{errors.ctplNumber}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="modal-footer-enhanced">
          <button className="btn btn-secondary" onClick={closeModal}>
            <i className="fas fa-times"></i> Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            <i className={isEditMode ? "fas fa-save" : "fas fa-plus"}></i>
            {isEditMode ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
// src/components/modals/EditItemModal.js
import React, { useState, useEffect } from 'react';
import { formatPeso } from '../../utils/formatters';
import { useInventory } from '../../hooks/useInventory';
import DatePicker from '../common/DatePicker';
import './Modal.css';

const EditItemModal = () => {
  const { showEditItemModal, closeEditItemModal, editingItem, handleUpdateItem } = useInventory();
  const [formData, setFormData] = useState({
    component: '',
    partsName: '',
    partsNumber: '',
    pic: '',
    quantity: 1,
    rack: '',
    date: '',
    dateDisplay: '',
    itemPrice: '',
    tax: '',
    totalAmount: '',
    poNumber: '',
    ctplNumber: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (editingItem) {
      // Extract numeric values from formatted strings
      const itemPrice = editingItem.itemPrice.replace ? editingItem.itemPrice.replace(/[^\d.]/g, '') : editingItem.itemPrice;
      const tax = editingItem.tax.replace ? editingItem.tax.replace(/[^\d.]/g, '') : editingItem.tax;
      const totalAmount = editingItem.totalAmount.replace ? editingItem.totalAmount.replace(/[^\d.]/g, '') : editingItem.totalAmount;
      
      // Format date display
      let dateDisplay = editingItem.date;
      let dateValue = editingItem.date;
      
      // Convert YYYY-MM-DD to DD/MM/YYYY if needed
      if (dateValue && dateValue.includes('-')) {
        const [year, month, day] = dateValue.split('-');
        dateDisplay = `${day}/${month}/${year}`;
      }
      
      setFormData({
        ...editingItem,
        itemPrice,
        tax,
        totalAmount,
        date: dateValue,
        dateDisplay: dateDisplay
      });
      
      setImagePreview(editingItem.image || editingItem.imageData);
    }
  }, [editingItem]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
    
    // Clear error for this field if any
    if (formErrors[id]) {
      setFormErrors({
        ...formErrors,
        [id]: null
      });
    }
    
    // Calculate total amount when price, quantity or tax changes
    if (['itemPrice', 'quantity', 'tax'].includes(id)) {
      calculateTotal();
    }
  };

  // Handle date change from DatePicker
  const handleDateChange = (dateStr) => {
    // DatePicker will return date in DD/MM/YYYY format
    setFormData({
      ...formData,
      dateDisplay: dateStr,
      // Convert DD/MM/YYYY to YYYY-MM-DD for internal storage
      date: dateStr.split('/').reverse().join('-')
    });
    
    // Clear error if any
    if (formErrors.date) {
      setFormErrors({
        ...formErrors,
        date: null
      });
    }
  };

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

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setFormErrors({
          ...formErrors,
          image: 'Invalid file type. Please select a JPEG, PNG, or GIF image.'
        });
        return;
      }
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Clear error if any
      if (formErrors.image) {
        setFormErrors({
          ...formErrors,
          image: null
        });
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    const requiredFields = [
      'component', 'partsName', 'partsNumber', 'pic', 
      'quantity', 'rack', 'itemPrice', 'tax', 
      'totalAmount', 'poNumber', 'ctplNumber'
    ];
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });
    
    if (formData.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    
    if (formData.itemPrice <= 0) {
      errors.itemPrice = 'Price must be greater than 0';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const updatedItem = {
        ...formData,
        image: imagePreview,
        imageData: imagePreview, // Include both for consistency
        itemPrice: formatPeso(parseFloat(formData.itemPrice)),
        tax: formatPeso(parseFloat(formData.tax)),
        totalAmount: formatPeso(parseFloat(formData.totalAmount))
      };
      
      handleUpdateItem(updatedItem);
    }
  };

  if (!showEditItemModal) return null;

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Item</h3>
          <span className="close-button" onClick={closeEditItemModal}>&times;</span>
        </div>
        <div className="modal-body">
          <form id="editItemForm">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="component">Component *</label>
                <div className="select-wrapper">
                  <select 
                    id="component" 
                    value={formData.component || ''}
                    onChange={handleInputChange}
                    required
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
                {formErrors.component && <div className="error-message">{formErrors.component}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="partsName">Parts Name *</label>
                <input 
                  type="text" 
                  id="partsName" 
                  placeholder="Enter item name" 
                  value={formData.partsName || ''}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.partsName && <div className="error-message">{formErrors.partsName}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="partsNumber">Parts Number *</label>
                <input 
                  type="text" 
                  id="partsNumber" 
                  placeholder="Enter serial number" 
                  value={formData.partsNumber || ''}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.partsNumber && <div className="error-message">{formErrors.partsNumber}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="pic">PIC *</label>
                <input 
                  type="text" 
                  id="pic" 
                  placeholder="Enter PIC" 
                  value={formData.pic || ''}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.pic && <div className="error-message">{formErrors.pic}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="image">Image</label>
                <div className="file-input-wrapper">
                  <input 
                    type="text" 
                    id="imageDisplay" 
                    placeholder="Choose File" 
                    readOnly
                    value={imagePreview ? "Image Selected" : ""}
                  />
                  <label htmlFor="image" className="file-input-label">
                    <i className="fas fa-paperclip"></i>
                  </label>
                  <input 
                    type="file" 
                    id="image" 
                    style={{ display: 'none' }} 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
                {formErrors.image && <div className="error-message">{formErrors.image}</div>}
                {imagePreview && (
                  <div className="image-preview" style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px' }} 
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="quantity">Quantity *</label>
                <input 
                  type="number" 
                  id="quantity" 
                  placeholder="Enter item number" 
                  min="1" 
                  value={formData.quantity || 1}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.quantity && <div className="error-message">{formErrors.quantity}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rack">Rack *</label>
                <div className="select-wrapper">
                  <select 
                    id="rack" 
                    value={formData.rack || ''}
                    onChange={handleInputChange}
                    required
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
                {formErrors.rack && <div className="error-message">{formErrors.rack}</div>}
              </div>
              
              {/* Using the DatePicker component */}
              <DatePicker 
                id="date"
                label="Date *"
                value={formData.dateDisplay}
                onChange={handleDateChange}
                required
              />
              {formErrors.date && <div className="error-message">{formErrors.date}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemPrice">Item Price *</label>
                <input 
                  type="number" 
                  id="itemPrice" 
                  placeholder="Enter price" 
                  min="0" 
                  step="0.01" 
                  value={formData.itemPrice || ''}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.itemPrice && <div className="error-message">{formErrors.itemPrice}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="tax">Tax *</label>
                <input 
                  type="number" 
                  id="tax" 
                  placeholder="Enter Tax" 
                  min="0" 
                  step="0.01" 
                  value={formData.tax || ''}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.tax && <div className="error-message">{formErrors.tax}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="totalAmount">Total Amount *</label>
                <input 
                  type="number" 
                  id="totalAmount" 
                  placeholder="Enter Amount" 
                  min="0" 
                  step="0.01" 
                  value={formData.totalAmount || ''}
                  onChange={handleInputChange}
                  readOnly
                  required
                />
                {formErrors.totalAmount && <div className="error-message">{formErrors.totalAmount}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="poNumber">PO Number *</label>
                <input 
                  type="text" 
                  id="poNumber" 
                  placeholder="Enter PO No." 
                  value={formData.poNumber || ''}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.poNumber && <div className="error-message">{formErrors.poNumber}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="ctplNumber">CTPL Number *</label>
                <input 
                  type="text" 
                  id="ctplNumber" 
                  placeholder="Enter CTPL No." 
                  value={formData.ctplNumber || ''}
                  onChange={handleInputChange}
                  required
                />
                {formErrors.ctplNumber && <div className="error-message">{formErrors.ctplNumber}</div>}
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button id="cancelButton" className="btn btn-light" onClick={closeEditItemModal}>Cancel</button>
          <button id="updateButton" className="btn btn-primary" onClick={handleSubmit}>Update</button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
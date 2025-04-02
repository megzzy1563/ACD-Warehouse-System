// src/components/Modals/EditProfileModal.js
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import '../../styles/ModalStyles.css';

const EditProfileModal = () => {
  const { 
    userData, 
    updateUserData, 
    showEditProfileModal, 
    setShowEditProfileModal 
  } = useContext(AppContext);
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    profileName: '',
    profileEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Profile image state
  const [profileImage, setProfileImage] = useState(null);
  
  // Password visibility state
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  
  // Form validation state
  const [errors, setErrors] = useState({});
  
  // Set up animation and load user data
  useEffect(() => {
    if (showEditProfileModal) {
      // Small delay for animation to work properly
      setTimeout(() => setIsVisible(true), 50);
      
      // Load user data
      setFormData({
        profileName: userData?.name || '',
        profileEmail: userData?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setProfileImage(userData?.avatar || null);
      setErrors({});
    } else {
      setIsVisible(false);
    }
  }, [showEditProfileModal, userData]);
  
  // Close modal with fade-out effect
  const closeModal = () => {
    setIsVisible(false);
    setTimeout(() => setShowEditProfileModal(false), 300);
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
    
    // Check password match when changing password fields
    if (id === 'newPassword' || id === 'confirmPassword') {
      validatePasswordMatch();
    }
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setPasswordVisibility({
      ...passwordVisibility,
      [field]: !passwordVisibility[field]
    });
  };
  
  // Handle profile image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.match('image.*')) {
        setErrors({
          ...errors,
          profileImage: 'Please select a valid image file'
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({
          ...errors,
          profileImage: 'Image size must be less than 5MB'
        });
        return;
      }
      
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target.result);
      };
      reader.readAsDataURL(file);
      
      // Clear error if exists
      if (errors.profileImage) {
        setErrors({
          ...errors,
          profileImage: null
        });
      }
    }
  };
  
  // Validate password match
  const validatePasswordMatch = () => {
    if (formData.newPassword && formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setErrors({
          ...errors,
          confirmPassword: 'Passwords do not match'
        });
        return false;
      } else {
        // Clear error if passwords match
        if (errors.confirmPassword) {
          setErrors({
            ...errors,
            confirmPassword: null
          });
        }
      }
    }
    return true;
  };
  
  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.profileName) newErrors.profileName = 'Full Name is required';
    if (!formData.profileEmail) newErrors.profileEmail = 'Email is required';
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.profileEmail && !emailRegex.test(formData.profileEmail)) {
      newErrors.profileEmail = 'Please enter a valid email address';
    }
    
    // Current password is required for any changes
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required to save changes';
    }
    
    // Password validation if new password is provided
    if (formData.newPassword) {
      // Minimum 8 characters
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters long';
      }
      
      // Password match check
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    // Update user data (in a real app, this would include password validation/update)
    updateUserData({
      name: formData.profileName,
      email: formData.profileEmail,
      avatar: profileImage
    });
    
    // Close modal
    closeModal();
  };
  
  // If modal is not shown, don't render anything
  if (!showEditProfileModal) return null;

  return (
    <div className={`modal-overlay ${isVisible ? 'visible' : ''}`} onClick={closeModal}>
      <div 
        className={`modal-content-enhanced ${isVisible ? 'visible' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <div className="modal-header-enhanced">
          <h3>
            <i className="fas fa-user-edit"></i> Edit Profile
          </h3>
          <button className="close-button-enhanced" onClick={closeModal}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body-enhanced">
          {/* Profile Image */}
          <div className="profile-edit-container">
            <div className="profile-image-editor">
              <div 
                className="profile-image-circle"
                onClick={() => document.getElementById('profileImageUpload').click()}
              >
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="profile-avatar"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
                <div className="profile-image-overlay">
                  <i className="fas fa-camera"></i>
                </div>
                <input 
                  type="file" 
                  id="profileImageUpload" 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </div>
              {errors.profileImage && <div className="error-message centered">{errors.profileImage}</div>}
              <div className="profile-image-caption">Click to change profile picture</div>
            </div>
            
            {/* Form Content */}
            <div className="profile-form-container">
              {/* Basic Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <i className="fas fa-id-card"></i>
                  <h4>Personal Information</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="profileName">
                      Full Name <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="text" 
                        id="profileName" 
                        placeholder="Enter your full name" 
                        value={formData.profileName}
                        onChange={handleChange}
                        className={errors.profileName ? 'error' : ''}
                      />
                      <div className="input-icon-container">
                        <i className="fas fa-user"></i>
                      </div>
                    </div>
                    {errors.profileName && <div className="error-message">{errors.profileName}</div>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="profileEmail">
                      Company Email <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <input 
                        type="email" 
                        id="profileEmail" 
                        placeholder="Enter your company email" 
                        value={formData.profileEmail}
                        onChange={handleChange}
                        className={errors.profileEmail ? 'error' : ''}
                      />
                      <div className="input-icon-container">
                        <i className="fas fa-envelope"></i>
                      </div>
                    </div>
                    {errors.profileEmail && <div className="error-message">{errors.profileEmail}</div>}
                  </div>
                </div>
              </div>
              
              {/* Security Section */}
              <div className="form-section">
                <div className="section-header">
                  <i className="fas fa-lock"></i>
                  <h4>Security Settings</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="currentPassword">
                      Current Password <span className="required">*</span>
                    </label>
                    <div className="password-input-wrapper">
                      <input 
                        type={passwordVisibility.currentPassword ? 'text' : 'password'} 
                        id="currentPassword" 
                        placeholder="Enter current password" 
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className={errors.currentPassword ? 'error' : ''}
                      />
                      <div className="input-icon-container">
                        <i className="fas fa-key"></i>
                      </div>
                      <button 
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => togglePasswordVisibility('currentPassword')}
                      >
                        <i className={`fas fa-eye${passwordVisibility.currentPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    {errors.currentPassword && <div className="error-message">{errors.currentPassword}</div>}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="newPassword">New Password</label>
                    <div className="password-input-wrapper">
                      <input 
                        type={passwordVisibility.newPassword ? 'text' : 'password'} 
                        id="newPassword" 
                        placeholder="Enter new password" 
                        value={formData.newPassword}
                        onChange={handleChange}
                        className={errors.newPassword ? 'error' : ''}
                      />
                      <div className="input-icon-container">
                        <i className="fas fa-lock"></i>
                      </div>
                      <button 
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => togglePasswordVisibility('newPassword')}
                      >
                        <i className={`fas fa-eye${passwordVisibility.newPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    {errors.newPassword && <div className="error-message">{errors.newPassword}</div>}
                    <div className="password-info">
                      <i className="fas fa-info-circle"></i>
                      Password must be at least 8 characters long
                    </div>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="password-input-wrapper">
                      <input 
                        type={passwordVisibility.confirmPassword ? 'text' : 'password'} 
                        id="confirmPassword" 
                        placeholder="Confirm new password" 
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={errors.confirmPassword ? 'error' : ''}
                      />
                      <div className="input-icon-container">
                        <i className="fas fa-lock"></i>
                      </div>
                      <button 
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => togglePasswordVisibility('confirmPassword')}
                      >
                        <i className={`fas fa-eye${passwordVisibility.confirmPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
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
            <i className="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
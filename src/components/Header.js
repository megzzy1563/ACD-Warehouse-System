// src/components/Header.js
import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const Header = () => {
  const { 
    activeSection,
    userData, 
    unreadCount, 
    setShowProfileDropdown, 
    setShowNotificationDropdown,
    showProfileDropdown,
    showNotificationDropdown
  } = useContext(AppContext);

  // Toggle profile dropdown
  const toggleProfileDropdown = (e) => {
    e.stopPropagation();
    setShowProfileDropdown(!showProfileDropdown);
    setShowNotificationDropdown(false);
  };

  // Toggle notification dropdown
  const toggleNotificationDropdown = (e) => {
    e.stopPropagation();
    setShowNotificationDropdown(!showNotificationDropdown);
    setShowProfileDropdown(false);
  };

  return (
    <div className="header">
      <div className="greeting">
        <h2>
          {activeSection === 'Dashboard' ? `Hello ${userData.name}` : activeSection}
          <i className="fas fa-certificate verification-badge"></i>
        </h2>
        <span>
          {activeSection === 'Dashboard' ? 'Good Morning' : 
           activeSection === 'Inventory' ? 'Track and manage your inventory' :
           activeSection === 'Daily Reports' ? 'Track daily inventory changes' :
           activeSection === 'Scan Item' ? 'Scan QR code or barcode to track items' : ''}
        </span>
      </div>
      
      <div className="user-container">
        <div 
          className="notification-icon"
          onClick={toggleNotificationDropdown}
        >
          <i className="fas fa-bell"></i>
          {unreadCount > 0 && (
            <div className="notification-badge">{unreadCount}</div>
          )}
        </div>
        
        <div 
          className="user-profile"
          onClick={toggleProfileDropdown}
        >
          <img src={userData.avatar} alt="User Avatar" className="user-avatar" />
          <div className="user-info">
            <div className="user-name">{userData.name}</div>
            <div className="user-role">{userData.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
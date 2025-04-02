// src/components/Sidebar.js
import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const Sidebar = () => {
  const { activeSection, setActiveSection, isDarkMode, toggleDarkMode } = useContext(AppContext);

  // Handle navigation click
  const handleNavClick = (section) => {
    setActiveSection(section);
  };

  return (
    <div className="sidebar">
      <div className="logo-container">
        <img src="/assets/ACD Logo.png" alt="ACD Logo" className="logo" />
        <div className="logo-text">SMART INVENTORY SYSTEM</div>
      </div>
      
      <div 
        className={`nav-item ${activeSection === 'Dashboard' ? 'active' : ''}`}
        onClick={() => handleNavClick('Dashboard')}
      >
        <i className="fas fa-th-large"></i>
        <span>Dashboard</span>
      </div>
      
      <div 
        className={`nav-item ${activeSection === 'Inventory' ? 'active' : ''}`}
        onClick={() => handleNavClick('Inventory')}
      >
        <i className="fas fa-box"></i>
        <span>Inventory</span>
      </div>
      
      <div 
        className={`nav-item ${activeSection === 'Daily Reports' ? 'active' : ''}`}
        onClick={() => handleNavClick('Daily Reports')}
      >
        <i className="fas fa-file-alt"></i>
        <span>Daily Reports</span>
      </div>
      
      <div 
        className={`nav-item ${activeSection === 'Scan Item' ? 'active' : ''}`}
        onClick={() => handleNavClick('Scan Item')}
      >
        <i className="fas fa-qrcode"></i>
        <span>Scan Item</span>
      </div>
      
      <div className="theme-toggle">
        <div 
          className={`toggle-btn ${!isDarkMode ? 'active' : ''}`} 
          onClick={() => toggleDarkMode(false)}
        >
          <i className="fas fa-sun"></i>
          <span>Light</span>
        </div>
        <div 
          className={`toggle-btn ${isDarkMode ? 'active' : ''}`}
          onClick={() => toggleDarkMode(true)}
        >
          <i className="fas fa-moon"></i>
          <span>Dark</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
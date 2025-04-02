// src/components/Footer.js
import React from 'react';

const Footer = () => {
  return (
    <div className="footer">
      <img 
        src="/assets/backhoe.png" 
        alt="Excavators Lineup" 
        className="footer-image" 
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/api/placeholder/800/150';
          e.target.alt = 'Excavators Lineup (Placeholder)';
        }}
      />
    </div>
  );
};

export default Footer;
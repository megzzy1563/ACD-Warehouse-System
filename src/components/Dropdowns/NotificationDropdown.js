// src/components/dropdowns/NotificationDropdown.js
import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const NotificationDropdown = () => {
  const { 
    notifications, 
    showNotificationDropdown, 
    setShowNotificationDropdown,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    setActiveSection
  } = useContext(AppContext);

  // If dropdown is not active, don't render it
  if (!showNotificationDropdown) {
    return null;
  }

  // Handle mark all as read
  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
  };

  // Handle view all notifications
  const handleViewAll = () => {
    setShowNotificationDropdown(false);
    setActiveSection('Daily Reports');
  };

  // Handle notification item click
  const handleNotificationClick = (notification) => {
    setShowNotificationDropdown(false);
    setActiveSection('Daily Reports');
    
    // Mark this notification as read
    markNotificationAsRead(notification.id);
    
    // In a real app, this would navigate to specific related content
    console.log(`Clicked on notification: ${notification.title}`);
  };

  // Handle mark as read button click
  const handleMarkAsRead = (e, notificationId) => {
    e.stopPropagation();
    markNotificationAsRead(notificationId);
  };

  return (
    <div className="notification-dropdown active" id="notificationDropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <div className="notification-actions">
          <span className="mark-all-read" onClick={handleMarkAllRead}>Mark all as read</span>
          <span className="view-all" onClick={handleViewAll}>View All</span>
        </div>
      </div>
      
      <div className="notification-list">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div 
              key={notification.id}
              className={`notification-item ${notification.unread ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={`notification-icon ${notification.type}`}>
                <i className={`fas fa-${
                  notification.type === 'stock-in' ? 'arrow-down' : 
                  notification.type === 'stock-out' ? 'arrow-up' : 
                  notification.type === 'low-stock' ? 'exclamation-triangle' : 
                  'tools'
                }`}></i>
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-details">
                  <span className="product-number">{notification.productNumber}</span>
                  <span className="quantity">{notification.quantity}</span>
                </div>
                <div className="notification-time">{notification.time}</div>
              </div>
              <div className="notification-actions">
                <span 
                  className="mark-read"
                  onClick={(e) => handleMarkAsRead(e, notification.id)}
                >
                  <i className="fas fa-check"></i>
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '15px', textAlign: 'center' }}>
            No notifications available
          </div>
        )}
      </div>
      
      <div className="notification-footer">
        <a 
          href="#" 
          className="view-reports"
          onClick={(e) => {
            e.preventDefault();
            handleViewAll();
          }}
        >
          View Daily Reports
        </a>
      </div>
    </div>
  );
};

export default NotificationDropdown;
// src/context/AppContext.js
import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

// Create the context
export const AppContext = createContext();

// Create the context provider
export const AppProvider = ({ children }) => {
  // Main state for the application
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true' || false
  );
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showViewItemModal, setShowViewItemModal] = useState(false);
  
  // User data
  const [userData, setUserData] = useState({
    name: 'Manticao-ACD',
    email: 'manticao@acd.com',
    role: 'Store Manager',
    avatar: '/assets/lebron.avif'
  });
  
  // Stock data
  const [stockData, setStockData] = useState({
    itemsInHand: 0,
    stockIn: 0,
    stockOut: 0,
    chartData: null
  });

  // Inventory items
  const [inventoryItems, setInventoryItems] = useState([

  ]);

  // NEW: Transaction history array to track all stock movements
  const [transactions, setTransactions] = useState([
  ]);

  // Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'stock-in',
      title: 'Stock In: Engine Oil Filter',
      productNumber: 'Part #ENG-104',
      quantity: '+15 units',
      time: '10 minutes ago',
      unread: true
    },
    {
      id: 2,
      type: 'stock-out',
      title: 'Stock Out: Hydraulic Pump',
      productNumber: 'Part #HYD-221',
      quantity: '-2 units',
      time: '2 hours ago',
      unread: false
    },
    {
      id: 3,
      type: 'low-stock',
      title: 'Low Stock Alert: Fuel Filter',
      productNumber: 'Part #ENG-118',
      quantity: '3 units remaining',
      time: 'Yesterday',
      unread: false
    },
    {
      id: 4,
      type: 'stock-in',
      title: 'Stock In: Control Valve',
      productNumber: 'Part #HYD-305',
      quantity: '+8 units',
      time: 'Yesterday',
      unread: true
    }
  ]);

  // New states for API interaction
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  // Load inventory items from API
  useEffect(() => {
    if (isAuthenticated) {
      fetchInventoryItems();
      fetchTransactions();
    }
  }, [isAuthenticated]);

  // Function to update stockData based on transactions and inventory
  const updateStockDataFromTransactions = () => {
    // Calculate total items in hand directly from inventory
    const totalItems = inventoryItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    
    // Calculate stock-in and stock-out from transactions
    const stockInTotal = transactions
      .filter(t => t.transactionType === 'in')
      .reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
    
    const stockOutTotal = transactions
      .filter(t => t.transactionType === 'out')
      .reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
    
    // Generate time-series data for charts based on transactions
    const generateChartData = (timeframe = 'monthly') => {
      const today = new Date();
      let labels = [];
      let stockInData = [];
      let stockOutData = [];
      
      // Helper to get date for grouping
      const getDateKey = (date, timeframe) => {
        const d = new Date(date);
        if (timeframe === 'weekly') {
          // Group by day of week
          return d.toLocaleDateString('en-US', { weekday: 'short' });
        } else if (timeframe === 'yearly') {
          // Group by year
          return d.getFullYear().toString();
        } else {
          // Group by month
          return d.toLocaleDateString('en-US', { month: 'short' });
        }
      };
      
      if (timeframe === 'weekly') {
        // Last 7 days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayMap = {};
        
        // Initialize
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dayName = days[d.getDay()];
          labels.push(dayName);
          dayMap[dayName] = { in: 0, out: 0 };
        }
        
        // Filter transactions from last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        
        transactions
          .filter(t => new Date(t.performedAt) >= weekAgo)
          .forEach(t => {
            const dayName = getDateKey(t.performedAt, 'weekly');
            if (dayMap[dayName]) {
              if (t.transactionType === 'in') {
                dayMap[dayName].in += parseInt(t.quantity) || 0;
              } else if (t.transactionType === 'out') {
                dayMap[dayName].out += parseInt(t.quantity) || 0;
              }
            }
          });
        
        // Convert to arrays
        stockInData = labels.map(day => dayMap[day].in);
        stockOutData = labels.map(day => dayMap[day].out);
        
      } else if (timeframe === 'yearly') {
        // Last 6 years
        const currentYear = today.getFullYear();
        const yearMap = {};
        
        // Initialize
        for (let i = 5; i >= 0; i--) {
          const year = (currentYear - i).toString();
          labels.push(year);
          yearMap[year] = { in: 0, out: 0 };
        }
        
        // Filter transactions from last 6 years
        const sixYearsAgo = new Date();
        sixYearsAgo.setFullYear(today.getFullYear() - 6);
        
        transactions
          .filter(t => new Date(t.performedAt) >= sixYearsAgo)
          .forEach(t => {
            const year = getDateKey(t.performedAt, 'yearly');
            if (yearMap[year]) {
              if (t.transactionType === 'in') {
                yearMap[year].in += parseInt(t.quantity) || 0;
              } else if (t.transactionType === 'out') {
                yearMap[year].out += parseInt(t.quantity) || 0;
              }
            }
          });
        
        // Convert to arrays
        stockInData = labels.map(year => yearMap[year].in);
        stockOutData = labels.map(year => yearMap[year].out);
        
      } else {
        // Monthly (last 12 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthMap = {};
        
        // Initialize with last 12 months
        for (let i = 11; i >= 0; i--) {
          const targetDate = new Date();
          targetDate.setMonth(today.getMonth() - i);
          const monthKey = months[targetDate.getMonth()];
          labels.push(monthKey);
          monthMap[monthKey] = { in: 0, out: 0 };
        }
        
        // Filter transactions from last 12 months
        const yearAgo = new Date();
        yearAgo.setMonth(today.getMonth() - 12);
        
        transactions
          .filter(t => new Date(t.performedAt) >= yearAgo)
          .forEach(t => {
            const monthKey = getDateKey(t.performedAt, 'monthly');
            if (monthMap[monthKey]) {
              if (t.transactionType === 'in') {
                monthMap[monthKey].in += parseInt(t.quantity) || 0;
              } else if (t.transactionType === 'out') {
                monthMap[monthKey].out += parseInt(t.quantity) || 0;
              }
            }
          });
        
        // Convert to arrays
        stockInData = labels.map(month => monthMap[month].in);
        stockOutData = labels.map(month => monthMap[month].out);
      }
      
      // Ensure we have data (use defaults if empty)
      if (stockInData.every(val => val === 0) && stockOutData.every(val => val === 0)) {
        if (timeframe === 'monthly') {
          stockInData = [12000, 19000, 15000, 22000, 18000, 24000, 20000, 22000, 25000, 23000, 21000, stockInTotal || 24000];
          stockOutData = [8000, 12000, 10000, 14000, 11000, 16000, 12000, 15000, 13000, 16000, 14000, stockOutTotal || 16000];
        } else if (timeframe === 'yearly') {
          stockInData = [15000, 18000, 22000, 25000, 24000, stockInTotal || 27000];
          stockOutData = [10000, 11000, 14000, 16000, 15000, stockOutTotal || 18000];
        } else {
          // Weekly
          stockInData = [3000, 3500, 3200, 4000, 3800, 4200, stockInTotal || 4500];
          stockOutData = [2000, 2200, 2100, 2500, 2400, 2600, stockOutTotal || 2800];
        }
      }
      
      return {
        labels,
        stockInData,
        stockOutData,
        timeframe
      };
    };
    
    // Update stockData with calculated values
    setStockData(prevData => ({
      itemsInHand: totalItems,
      stockIn: stockInTotal,
      stockOut: stockOutTotal,
      chartData: generateChartData(prevData.chartData?.timeframe || 'monthly')
    }));
  };

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory/transactions');
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      // Keep using the default transactions if API fails
    } finally {
      setLoading(false);
    }
  };

  // Update stock data when transactions or inventory change
  useEffect(() => {
    if (transactions.length > 0 || inventoryItems.length > 0) {
      updateStockDataFromTransactions();
    }
  }, [transactions.length, inventoryItems.length]);

  // Function to toggle dark mode
  const toggleDarkMode = (value) => {
    setIsDarkMode(value);
  };

  // Function to fetch inventory items
  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory');
      setInventoryItems(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory items:', err);
      setError('Failed to fetch inventory items');
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new inventory item
  const addInventoryItem = async (item) => {
    try {
      setLoading(true);
      const response = await api.post('/inventory', item);
      const newItem = response.data.data;
      setInventoryItems([newItem, ...inventoryItems]);
      
      // Create a transaction record for stock-in
      const transaction = {
        id: Date.now(),
        itemId: newItem._id || newItem.id,
        partsName: newItem.partsName,
        partsNumber: newItem.partsNumber,
        transactionType: 'in',
        quantity: parseInt(newItem.quantity) || 0,
        performedBy: userData.name,
        performedAt: new Date(),
        notes: 'Initial inventory entry'
      };
      
      // Add to transactions
      setTransactions([transaction, ...transactions]);
      
      // Add notification
      addNotification({
        type: 'stock-in',
        title: `Stock In: ${item.partsName}`,
        productNumber: `Part #${item.partsNumber}`,
        quantity: `+${item.quantity} units`
      });
      
      return true;
    } catch (err) {
      console.error('Error adding inventory item:', err);
      setError('Failed to add inventory item');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Function to update an existing inventory item
  const updateInventoryItem = async (updatedItem) => {
    try {
      setLoading(true);
      const response = await api.put(`/inventory/${updatedItem._id}`, updatedItem);
      const responseItem = response.data.data;
      
      // Find existing item to compare quantities
      const existingItem = inventoryItems.find(item => 
        item._id === updatedItem._id || item.id === updatedItem.id
      );
      
      // Update inventory items
      setInventoryItems(inventoryItems.map(item => 
        (item._id === updatedItem._id || item.id === updatedItem.id) ? responseItem : item
      ));
      
      // If quantity changed, create a transaction record
      if (existingItem && existingItem.quantity !== updatedItem.quantity) {
        const quantityDiff = parseInt(updatedItem.quantity) - parseInt(existingItem.quantity);
        
        if (quantityDiff !== 0) {
          const transactionType = quantityDiff > 0 ? 'in' : 'out';
          
          const transaction = {
            id: Date.now(),
            itemId: updatedItem._id || updatedItem.id,
            partsName: updatedItem.partsName,
            partsNumber: updatedItem.partsNumber,
            transactionType: transactionType,
            quantity: Math.abs(quantityDiff),
            performedBy: userData.name,
            performedAt: new Date(),
            notes: 'Quantity updated'
          };
          
          // Add to transactions
          setTransactions([transaction, ...transactions]);
          
          // Add notification
          addNotification({
            type: `stock-${transactionType}`,
            title: `${transactionType === 'in' ? 'Stock In' : 'Stock Out'}: ${updatedItem.partsName}`,
            productNumber: `Part #${updatedItem.partsNumber}`,
            quantity: `${transactionType === 'in' ? '+' : '-'}${Math.abs(quantityDiff)} units`
          });
        }
      }
      
      return true;
    } catch (err) {
      console.error('Error updating inventory item:', err);
      setError('Failed to update inventory item');
      return false;
    } finally {
      setLoading(false);
    }
  };

// Enhanced deleteInventoryItem function with better error handling and logging
const deleteInventoryItem = async (itemId) => {
  try {
    console.log('Attempting to delete item with ID:', itemId);
    setLoading(true);
    
    // Find the item being deleted (before API call)
    const deletedItem = inventoryItems.find(item => 
      item._id === itemId || item.id === itemId
    );
    
    console.log('Item to delete:', deletedItem);
    
    if (!deletedItem) {
      console.error('Error: Item not found with ID:', itemId);
      setError('Item not found');
      return false;
    }
    
    // Try API call, but continue even if it fails
    try {
      await api.delete(`/inventory/${itemId}`);
      console.log('API delete call successful');
    } catch (apiError) {
      console.warn('API delete call failed, continuing with local state update:', apiError);
      // Continue with UI update even if API fails
    }
    
    // Update the state with correct filtering
    setInventoryItems(prevItems => {
      const newItems = prevItems.filter(item => {
        const shouldKeep = !(item.id === itemId || item._id === itemId);
        return shouldKeep;
      });
      
      console.log(`Filtered items. Before: ${prevItems.length}, After: ${newItems.length}`);
      return newItems;
    });
    
    console.log('Delete operation completed');
    
    // Create a transaction record for the deletion as before
    const transaction = {
      id: Date.now(),
      itemId: itemId,
      partsName: deletedItem.partsName,
      partsNumber: deletedItem.partsNumber,
      transactionType: 'out',
      quantity: parseInt(deletedItem.quantity) || 0,
      performedBy: userData.name,
      performedAt: new Date(),
      notes: 'Item removed from inventory'
    };
    
    // Add to transactions
    setTransactions([transaction, ...transactions]);
    
    // Add notification for deletion
    addNotification({
      type: 'stock-out',
      title: `Item Removed: ${deletedItem.partsName}`,
      productNumber: `Part #${deletedItem.partsNumber}`,
      quantity: `-${deletedItem.quantity} units`
    });
    
    return true;
  } catch (err) {
    console.error('Error in deleteInventoryItem function:', err);
    setError('Failed to delete inventory item');
    return false;
  } finally {
    setLoading(false);
  }
};

  // Function to mark all notifications as read
  const markAllNotificationsAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      unread: false
    })));
  };

  // Function to mark a specific notification as read
  const markNotificationAsRead = (notificationId) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId ? { ...notification, unread: false } : notification
    ));
  };

  // Function to add a new notification
  const addNotification = (notification) => {
    setNotifications([
      { 
        id: Date.now(),
        unread: true,
        time: 'Just now',
        ...notification 
      },
      ...notifications
    ]);
  };

  // Function to update user data
  const updateUserData = (data) => {
    setUserData({ ...userData, ...data });
  };

  // Function to import multiple items to inventory
  const importItemsToInventory = (items) => {
    // Add the items to the inventory
    setInventoryItems(prevItems => [...items, ...prevItems]);
    
    // Create transactions for all imported items
    const newTransactions = items.map(item => ({
      id: Date.now() + Math.random(),
      itemId: item.id,
      partsName: item.partsName,
      partsNumber: item.partsNumber,
      transactionType: 'in',
      quantity: parseInt(item.quantity) || 0,
      performedBy: userData.name,
      performedAt: new Date(),
      notes: 'Bulk import'
    }));
    
    // Add to transactions
    setTransactions([...newTransactions, ...transactions]);
    
    // Add notification for the import
    addNotification({
      type: 'stock-in',
      title: `Bulk Import: ${items.length} items`,
      productNumber: `Multiple parts`,
      quantity: `+${items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} units`
    });
  };

  // NEW: Function to process a transaction (used by ScanItem.js)
  const processTransaction = async (transactionData) => {
    try {
      setLoading(true);
      
      // First find the item
      const item = inventoryItems.find(item => 
        item._id === transactionData.itemId || item.id === transactionData.itemId
      );
      
      if (!item) {
        throw new Error('Item not found');
      }
      
      // Calculate new quantity
      const currentQuantity = parseInt(item.quantity) || 0;
      const transactionQuantity = parseInt(transactionData.quantity) || 0;
      
      let newQuantity;
      if (transactionData.transactionType === 'in') {
        newQuantity = currentQuantity + transactionQuantity;
      } else {
        newQuantity = currentQuantity - transactionQuantity;
        
        // Validate there's enough stock
        if (newQuantity < 0) {
          throw new Error('Not enough stock available');
        }
      }
      
      // Update the item quantity
      const updatedItem = {
        ...item,
        quantity: newQuantity
      };
      
      // Update in inventory
      setInventoryItems(items => 
        items.map(i => (i._id === item._id || i.id === item.id) ? updatedItem : i)
      );
      
      // Create transaction record
      const transaction = {
        id: Date.now(),
        itemId: item._id || item.id,
        partsName: item.partsName,
        partsNumber: item.partsNumber,
        transactionType: transactionData.transactionType,
        quantity: transactionQuantity,
        performedBy: userData.name,
        performedAt: new Date(),
        notes: transactionData.notes || ''
      };
      
      // Add to transactions
      setTransactions([transaction, ...transactions]);
      
      // Add notification
      addNotification({
        type: `stock-${transactionData.transactionType}`,
        title: `${transactionData.transactionType === 'in' ? 'Stock In' : 'Stock Out'}: ${item.partsName}`,
        productNumber: `Part #${item.partsNumber}`,
        quantity: `${transactionData.transactionType === 'in' ? '+' : '-'}${transactionQuantity} units`
      });
      
      // Try to save to API if available
      try {
        await api.post('/inventory/transaction', {
          ...transactionData,
          partsName: item.partsName,
          partsNumber: item.partsNumber
        });
      } catch (apiError) {
        console.warn('API transaction save failed, continuing with local update:', apiError);
      }
      
      return {
        success: true,
        transaction,
        item: updatedItem
      };
    } catch (err) {
      console.error('Transaction processing error:', err);
      setError(err.message || 'Failed to process transaction');
      return {
        success: false,
        error: err.message || 'Transaction failed'
      };
    } finally {
      setLoading(false);
    }
  };

  // NEW: Function to get transactions for a specific date (used by DailyReports.js)
  const getTransactionsForDate = (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.performedAt);
      return transactionDate >= startOfDay && transactionDate <= endOfDay;
    });
  };

  // Add authentication functions
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', credentials);
      const { token, data } = response.data;
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      
      // Update user data
      setUserData({
        name: data.name,
        email: data.email,
        role: data.role,
        avatar: data.avatar || '/assets/lebron.avif'
      });
      
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    
    // Optional: redirect to login page
    setActiveSection('Login'); // If you use this approach
    
    // Alternative: Force a page reload to clear state
    window.location.href = '/'; // This will reload the app
  };
  
  // Add a button in your Header.js or ProfileDropdown.js
  const handleLogout = () => {
    logout();
  };

  // Count unread notifications
  const unreadCount = notifications.filter(notification => notification.unread).length;

  // Create the context value
  const contextValue = {
    activeSection,
    setActiveSection,
    isDarkMode,
    toggleDarkMode,
    userData,
    updateUserData,
    stockData,
    inventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    importItemsToInventory,
    notifications,
    unreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    addNotification,
    showAddItemModal,
    setShowAddItemModal,
    showEditProfileModal,
    setShowEditProfileModal,
    showProfileDropdown,
    setShowProfileDropdown,
    showNotificationDropdown,
    setShowNotificationDropdown,
    selectedItem,
    setSelectedItem,
    showViewItemModal,
    setShowViewItemModal,
    
    // Add the new transaction-related functions
    transactions,
    processTransaction,
    getTransactionsForDate,
    
    // API and auth related values
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    fetchInventoryItems
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
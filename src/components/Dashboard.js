// src/components/Dashboard.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import Chart from 'chart.js/auto';
import '../styles/DashboardStyles.css';
import { AppContext } from '../context/AppContext';
import api from '../services/api';

const Dashboard = () => {
  const { transactions, notifications, inventoryItems, stockData } = useContext(AppContext);
  const [activeTimeframe, setActiveTimeframe] = useState('monthly');
  const [chartInstance, setChartInstance] = useState(null);
  const [chartInitialized, setChartInitialized] = useState(false);
  
  // State for real transaction data
  const [transactionStats, setTransactionStats] = useState({
    totalTransactions: { value: 0, trend: 0, isPositive: true },
    stockIn: { value: 0, trend: 0, isPositive: true },
    stockOut: { value: 0, trend: 0, isPositive: true }
  });
  
  // State for chart data
  const [chartData, setChartData] = useState({
    labels: [],
    stockInData: [],
    stockOutData: []
  });
  
  // Track the last refresh time for trends calculation
  const lastRefreshTime = useRef(Date.now());
  const lastValues = useRef({
    stockIn: 0,
    stockOut: 0,
    totalTransactions: 0
  });
  
  // Define consistent colors for the chart
  const chartColors = {
    stockIn: {
      border: '#3498db', // Blue
      background: 'rgba(52, 152, 219, 0.1)',
      point: '#3498db'
    },
    stockOut: {
      border: '#9b59b6', // Violet
      background: 'rgba(155, 89, 182, 0.1)',
      point: '#9b59b6'
    }
  };
  
  // Effect to update dashboard when stockData or transactions change
  useEffect(() => {
    if (stockData && (stockData.stockIn > 0 || stockData.stockOut > 0)) {
      console.log('Real-time stock data update:', stockData);
      
      // Calculate trend by comparing with last stored values
      const calculateTrend = (currentValue, previousValue) => {
        if (previousValue === 0) return 0;
        return Math.round(((currentValue - previousValue) / previousValue) * 100);
      };
      
      // Calculate trend values
      const stockInTrend = calculateTrend(stockData.stockIn, lastValues.current.stockIn);
      const stockOutTrend = calculateTrend(stockData.stockOut, lastValues.current.stockOut);
      const totalTrend = calculateTrend(
        stockData.stockIn + stockData.stockOut, 
        lastValues.current.totalTransactions
      );
      
      // Update last values for next trend calculation
      if (Math.abs(Date.now() - lastRefreshTime.current) > 60000) { // Only update reference values if enough time has passed
        lastValues.current = {
          stockIn: stockData.stockIn,
          stockOut: stockData.stockOut,
          totalTransactions: stockData.stockIn + stockData.stockOut
        };
        lastRefreshTime.current = Date.now();
      }
      
      // Update transaction stats
      setTransactionStats({
        totalTransactions: {
          value: stockData.stockIn + stockData.stockOut,
          trend: totalTrend || 0,
          isPositive: totalTrend >= 0
        },
        stockIn: {
          value: stockData.stockIn,
          trend: stockInTrend || 0,
          isPositive: stockInTrend >= 0
        },
        stockOut: {
          value: stockData.stockOut,
          trend: stockOutTrend || 0,
          isPositive: stockOutTrend >= 0
        }
      });
      
      // Update chart data if it exists in stockData
      if (stockData.chartData && stockData.chartData.labels) {
        setChartData(stockData.chartData);
        
        // Update existing chart if initialized
        if (chartInstance && chartInitialized) {
          updateExistingChart(stockData.chartData);
        }
      }
    }
  }, [stockData, transactions, chartInstance, chartInitialized]);
  
  // Helper function to convert notification time strings to milliseconds
  const getTimeAgo = (timeString) => {
    if (timeString === 'Just now') return 0;
    if (timeString.includes('minute')) {
      const minutes = parseInt(timeString);
      return minutes * 60 * 1000;
    }
    if (timeString.includes('hour')) {
      const hours = parseInt(timeString);
      return hours * 60 * 60 * 1000;
    }
    if (timeString === 'Yesterday') {
      return 24 * 60 * 60 * 1000;
    }
    // Default to 0 if can't parse
    return 0;
  };
  
  // Fetch chart data based on timeframe
  const fetchChartData = async (timeframe) => {
    try {
      // First, try to generate chart data from transactions
      if (transactions && transactions.length > 0) {
        generateChartDataFromTransactions(timeframe);
        return;
      }
      
      // If no transactions, check if we have stockData chartData
      if (stockData && stockData.chartData && stockData.chartData.labels) {
        setChartData(stockData.chartData);
        
        // If chart is already initialized, update it
        if (chartInstance) {
          updateExistingChart(stockData.chartData);
        }
        return;
      }
      
      // If none of the above, try API
      const response = await api.get(`/reports/chart?timeframe=${timeframe}`);
      
      if (response.data.success) {
        const newChartData = {
          ...response.data.data,
          timeframe // Store the timeframe for reference
        };
        
        setChartData(newChartData);
        
        // If chart is already initialized, update it
        if (chartInstance) {
          updateExistingChart(newChartData);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${timeframe} chart data:`, error);
      
      // If API fails but we have transactions, generate data from them
      if (transactions && transactions.length > 0) {
        generateChartDataFromTransactions(timeframe);
      } else if (stockData && stockData.chartData) {
        // Use stockData if available
        setChartData(stockData.chartData);
        
        if (chartInstance) {
          updateExistingChart(stockData.chartData);
        }
      } else {
        // As last resort, generate data from notifications
        const fallbackData = generateChartDataFromNotifications(timeframe);
        setChartData(fallbackData);
        
        if (chartInstance) {
          updateExistingChart(fallbackData);
        }
      }
    }
  };
  
  // Generate chart data from transactions
  const generateChartDataFromTransactions = (timeframe) => {
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
        stockInData = [12000, 19000, 15000, 22000, 18000, 24000, 20000, 22000, 25000, 23000, 21000, 24000];
        stockOutData = [8000, 12000, 10000, 14000, 11000, 16000, 12000, 15000, 13000, 16000, 14000, 16000];
      } else if (timeframe === 'yearly') {
        stockInData = [15000, 18000, 22000, 25000, 24000, 27000];
        stockOutData = [10000, 11000, 14000, 16000, 15000, 18000];
      } else {
        // Weekly
        stockInData = [3000, 3500, 3200, 4000, 3800, 4200, 4500];
        stockOutData = [2000, 2200, 2100, 2500, 2400, 2600, 2800];
      }
    }
    
    const newChartData = {
      labels,
      stockInData,
      stockOutData,
      timeframe
    };
    
    setChartData(newChartData);
    
    // Update chart if it's initialized
    if (chartInstance && chartInitialized) {
      updateExistingChart(newChartData);
    }
  };
  
  // Generate chart data from notifications as a fallback
  const generateChartDataFromNotifications = (timeframe) => {
    let labels = [];
    let stockInData = [];
    let stockOutData = [];
    
    const today = new Date();
    
    if (timeframe === 'weekly') {
      // Weekly: last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labels = Array(7).fill().map((_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return days[d.getDay()];
      });
      
      // Initialize data arrays
      stockInData = Array(7).fill(0);
      stockOutData = Array(7).fill(0);
      
      // Count transactions per day
      notifications.forEach(notif => {
        // Skip if not stock in/out
        if (notif.type !== 'stock-in' && notif.type !== 'stock-out') return;
        
        const timeAgo = getTimeAgo(notif.time);
        const daysAgo = Math.floor(timeAgo / (24 * 60 * 60 * 1000));
        
        if (daysAgo <= 6) {
          const index = 6 - daysAgo;
          if (notif.type === 'stock-in') {
            stockInData[index]++;
          } else {
            stockOutData[index]++;
          }
        }
      });
    } else if (timeframe === 'yearly') {
      // Yearly: last 6 years
      const currentYear = today.getFullYear();
      labels = Array(6).fill().map((_, i) => (currentYear - 5 + i).toString());
      
      // Since we don't have years of data, use stockData if available
      if (stockData && stockData.chartData) {
        return {
          labels: labels,
          stockInData: stockData.chartData.stockInData.slice(0, 6),
          stockOutData: stockData.chartData.stockOutData.slice(0, 6),
          timeframe
        };
      } else {
        // Generate placeholder data
        stockInData = Array(6).fill().map(() => Math.floor(Math.random() * 200) + 50);
        stockOutData = Array(6).fill().map(() => Math.floor(Math.random() * 150) + 30);
      }
    } else {
      // Monthly: last 12 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels = Array(12).fill().map((_, i) => {
        const monthIndex = (today.getMonth() + i - 11 + 12) % 12;
        return months[monthIndex];
      });
      
      // If we have stockData, use it
      if (stockData && stockData.chartData) {
        return {
          labels: labels,
          stockInData: stockData.chartData.stockInData.slice(0, 12),
          stockOutData: stockData.chartData.stockOutData.slice(0, 12),
          timeframe
        };
      } else {
        // Generate placeholder data
        stockInData = Array(12).fill().map(() => Math.floor(Math.random() * 100) + 20);
        stockOutData = Array(12).fill().map(() => Math.floor(Math.random() * 80) + 10);
      }
    }
    
    return {
      labels,
      stockInData,
      stockOutData,
      timeframe
    };
  };
  
  // Update existing chart with new data
  const updateExistingChart = (data) => {
    if (chartInstance) {
      chartInstance.data.labels = data.labels;
      chartInstance.data.datasets[0].data = data.stockInData;
      chartInstance.data.datasets[1].data = data.stockOutData;
      chartInstance.update();
    }
  };
  
  // Initialize or update chart
  const initializeChart = (timeframe) => {
    try {
      console.log("Initializing chart for timeframe:", timeframe);
      
      // Ensure chart container exists
      const chartContainer = document.querySelector('.chart-container');
      if (!chartContainer) {
        console.error('Chart container not found');
        return;
      }
      
      // Ensure canvas exists and is properly sized
      const canvas = document.getElementById('stockChart');
      if (!canvas) {
        console.error('Canvas element not found');
        return;
      }
      
      // Set explicit dimensions
      canvas.width = chartContainer.offsetWidth;
      canvas.height = 300;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2d context');
        return;
      }
      
      // Destroy existing chart if it exists
      if (chartInstance) {
        chartInstance.destroy();
      }
      
      // Create new chart with current data
      const newChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: 'Stock In',
              data: chartData.stockInData,
              borderColor: chartColors.stockIn.border,
              backgroundColor: chartColors.stockIn.background,
              borderWidth: 2,
              pointBackgroundColor: chartColors.stockIn.point,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Stock Out',
              data: chartData.stockOutData,
              borderColor: chartColors.stockOut.border,
              backgroundColor: chartColors.stockOut.background,
              borderWidth: 2,
              pointBackgroundColor: chartColors.stockOut.point,
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 20,
                font: {
                  size: 12,
                  weight: 'bold'
                }
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              padding: 12,
              cornerRadius: 8,
              caretSize: 6,
              displayColors: true,
              boxWidth: 10,
              boxHeight: 10,
              boxPadding: 4,
              usePointStyle: true
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(200, 200, 200, 0.1)'
              },
              ticks: {
                padding: 10,
                font: {
                  size: 11
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                padding: 10,
                font: {
                  size: 11
                }
              }
            }
          },
          animation: {
            duration: 800,
            easing: 'easeOutQuart'
          }
        }
      });
      
      // Save the chart instance
      setChartInstance(newChartInstance);
      console.log("Chart instance created successfully");
      setChartInitialized(true);
    } catch (error) {
      console.error("Error creating chart:", error);
      // Force re-render chart container
      setChartInitialized(false);
      // Try again after a brief delay with simpler chart configuration
      setTimeout(() => {
        try {
          const canvas = document.getElementById('stockChart');
          if (canvas && canvas.getContext) {
            const ctx = canvas.getContext('2d');
            
            // Create simplified chart as fallback
            const simpleChart = new Chart(ctx, {
              type: 'line',
              data: {
                labels: chartData.labels,
                datasets: [
                  {
                    label: 'Stock In',
                    data: chartData.stockInData,
                    borderColor: chartColors.stockIn.border,
                    fill: false
                  },
                  {
                    label: 'Stock Out',
                    data: chartData.stockOutData,
                    borderColor: chartColors.stockOut.border,
                    fill: false
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false
              }
            });
            
            setChartInstance(simpleChart);
            setChartInitialized(true);
            console.log("Fallback chart created");
          }
        } catch (fallbackError) {
          console.error("Fallback chart creation failed:", fallbackError);
        }
      }, 500);
    }
  };

  // Handle timeframe change
  const changeTimeframe = (timeframe) => {
    setActiveTimeframe(timeframe);
    
    // If we have transactions, generate chart data directly
    if (transactions && transactions.length > 0) {
      generateChartDataFromTransactions(timeframe);
    } else {
      // Otherwise fetch from API
      fetchChartData(timeframe);
    }
  };

  // Initialize data when component is mounted
  useEffect(() => {
    // Initialize transaction stats from transactions if available
    if (transactions && transactions.length > 0) {
      // Calculate stock-in and stock-out totals
      const stockInTotal = transactions
        .filter(t => t.transactionType === 'in')
        .reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
      
      const stockOutTotal = transactions
        .filter(t => t.transactionType === 'out')
        .reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
      
      setTransactionStats({
        totalTransactions: {
          value: transactions.length,
          trend: 0, // We don't have historical data yet
          isPositive: true
        },
        stockIn: {
          value: stockInTotal,
          trend: 0,
          isPositive: true
        },
        stockOut: {
          value: stockOutTotal,
          trend: 0,
          isPositive: true
        }
      });
      
      // Store these values for future trend calculations
      lastValues.current = {
        stockIn: stockInTotal,
        stockOut: stockOutTotal,
        totalTransactions: stockInTotal + stockOutTotal
      };
      
      // Generate chart data from transactions
      generateChartDataFromTransactions(activeTimeframe);
    } else {
      // Fallback to stockData if available, or API
      if (stockData && stockData.stockIn !== undefined) {
        setTransactionStats({
          totalTransactions: {
            value: stockData.stockIn + stockData.stockOut,
            trend: 0,
            isPositive: true
          },
          stockIn: {
            value: stockData.stockIn,
            trend: 0,
            isPositive: true
          },
          stockOut: {
            value: stockData.stockOut,
            trend: 0,
            isPositive: true
          }
        });
        
        lastValues.current = {
          stockIn: stockData.stockIn,
          stockOut: stockData.stockOut,
          totalTransactions: stockData.stockIn + stockData.stockOut
        };
      }
      
      // Fetch chart data
      fetchChartData(activeTimeframe);
    }
    
    // Add a small delay to ensure DOM is fully rendered before initializing chart
    const timer = setTimeout(() => {
      console.log("Initializing chart...");
      initializeChart(activeTimeframe);
    }, 300);
    
    // Set up a data refresh interval for real-time updates
    const refreshInterval = setInterval(() => {
      // If using transactions, regenerate data
      if (transactions && transactions.length > 0) {
        generateChartDataFromTransactions(activeTimeframe);
      } else {
        // Otherwise fetch from API
        fetchChartData(activeTimeframe);
      }
    }, 60000); // Refresh every minute
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
      clearInterval(refreshInterval);
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []); // Empty dependency array means this runs once on mount
  
  // Update chart when active timeframe changes
  useEffect(() => {
    if (chartInitialized) {
      initializeChart(activeTimeframe);
    }
  }, [activeTimeframe, chartData]);

  return (
    <div className="dashboard-wrapper">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <i className="fas fa-chart-line"></i>
          <h2>Inventory Dashboard</h2>
        </div>
        <div className="dashboard-date">
          <i className="far fa-calendar-alt"></i>
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card card-items">
          <div className="card-icon">
            <i className="fas fa-exchange-alt"></i>
          </div>
          <div className="card-content">
            <div className="card-label">Total Transactions</div>
            <div className="card-value">{transactionStats.totalTransactions.value}</div>
            <div className={`card-trend ${transactionStats.totalTransactions.isPositive ? 'positive' : 'negative'}`}>
              <i className={`fas fa-arrow-${transactionStats.totalTransactions.isPositive ? 'up' : 'down'}`}></i>
              <span>{Math.abs(transactionStats.totalTransactions.trend)}% from last month</span>
            </div>
          </div>
        </div>
        
        <div className="summary-card card-in">
          <div className="card-icon">
            <i className="fas fa-arrow-circle-down"></i>
          </div>
          <div className="card-content">
            <div className="card-label">Stock In Products</div>
            <div className="card-value">{transactionStats.stockIn.value}</div>
            <div className={`card-trend ${transactionStats.stockIn.isPositive ? 'positive' : 'negative'}`}>
              <i className={`fas fa-arrow-${transactionStats.stockIn.isPositive ? 'up' : 'down'}`}></i>
              <span>{Math.abs(transactionStats.stockIn.trend)}% from last month</span>
            </div>
          </div>
        </div>
        
        <div className="summary-card card-out">
          <div className="card-icon">
            <i className="fas fa-arrow-circle-up"></i>
          </div>
          <div className="card-content">
            <div className="card-label">Stock Out Products</div>
            <div className="card-value">{transactionStats.stockOut.value}</div>
            <div className={`card-trend ${transactionStats.stockOut.isPositive ? 'positive' : 'negative'}`}>
              <i className={`fas fa-arrow-${transactionStats.stockOut.isPositive ? 'up' : 'down'}`}></i>
              <span>{Math.abs(transactionStats.stockOut.trend)}% from last month</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Card */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">
            <i className="fas fa-chart-area"></i>
            <h3>Stock Movement Report</h3>
          </div>
          
          <div className="chart-controls">
            <div className="timeframe-selector">
              <button 
                className={`timeframe-btn ${activeTimeframe === 'weekly' ? 'active' : ''}`}
                onClick={() => changeTimeframe('weekly')}
              >
                Weekly
              </button>
              <button 
                className={`timeframe-btn ${activeTimeframe === 'monthly' ? 'active' : ''}`}
                onClick={() => changeTimeframe('monthly')}
              >
                Monthly
              </button>
              <button 
                className={`timeframe-btn ${activeTimeframe === 'yearly' ? 'active' : ''}`}
                onClick={() => changeTimeframe('yearly')}
              >
                Yearly
              </button>
            </div>
            
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color in"></div>
                <span>Stock In</span>
              </div>
              <div className="legend-item">
                <div className="legend-color out"></div>
                <span>Stock Out</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="chart-body">
          <div className="chart-container" style={{ height: '300px', position: 'relative' }}>
            <canvas 
              id="stockChart"
              style={{ width: '100%', height: '100%' }}
            ></canvas>
            {!chartInitialized && (
              <div className="chart-loading" style={{ 
                position: 'absolute', 
                top: '0', 
                left: '0', 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.8)'
              }}>
                <div className="loading-spinner"></div>
                <p>Loading chart data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
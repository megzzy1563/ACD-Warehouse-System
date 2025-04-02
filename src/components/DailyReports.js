// src/components/DailyReports.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/ReportStyles.css';

const DailyReports = () => {
  // Use current date for initial state
  const today = new Date();
  const formattedToday = today.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
  
  const [currentDate, setCurrentDate] = useState(formattedToday);
  const [apiDateParam, setApiDateParam] = useState(today.toISOString().split('T')[0]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Summary state
  const [summary, setSummary] = useState({
    itemsIn: 0,
    itemsOut: 0,
    totalTransactions: 0,
    totalQuantityIn: 0,
    totalQuantityOut: 0
  });
  
  // Fetch report data on date change
  useEffect(() => {
    fetchDailyReport(apiDateParam);
  }, [apiDateParam]);
  
  const fetchDailyReport = async (date) => {
    try {
      setLoading(true);
      console.log(`Fetching daily report for date: ${date}`);
      
      const response = await api.get(`/reports/daily?date=${date}`);
      
      if (response.data.success) {
        console.log('Daily report data:', response.data);
        
        // Format transactions for display
        const formattedReports = response.data.data.transactions.map(transaction => ({
          id: transaction._id,
          time: new Date(transaction.performedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          item: transaction.partsName,
          transactionType: transaction.transactionType === 'in' ? 'Stock In' : 'Stock Out',
          quantity: transaction.transactionType === 'in' ? `+${transaction.quantity}` : `-${transaction.quantity}`,
          user: transaction.performedBy?.name || 'System',
          notes: transaction.notes || ''
        }));
        
        setReports(formattedReports);
        
        // Update summary
        setSummary({
          itemsIn: response.data.data.summary.stockInCount,
          itemsOut: response.data.data.summary.stockOutCount,
          totalTransactions: response.data.data.summary.totalTransactions,
          totalQuantityIn: response.data.data.summary.stockInQuantity,
          totalQuantityOut: response.data.data.summary.stockOutQuantity
        });
      } else {
        // If no data, set empty arrays
        setReports([]);
        setSummary({
          itemsIn: 0,
          itemsOut: 0,
          totalTransactions: 0,
          totalQuantityIn: 0,
          totalQuantityOut: 0
        });
      }
    } catch (error) {
      console.error('Error fetching daily report:', error);
      setReports([]);
      setSummary({
        itemsIn: 0,
        itemsOut: 0,
        totalTransactions: 0,
        totalQuantityIn: 0,
        totalQuantityOut: 0
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to previous day
  const goToPreviousDay = () => {
    const date = new Date(apiDateParam);
    date.setDate(date.getDate() - 1);
    
    const prevDate = date.toISOString().split('T')[0];
    setApiDateParam(prevDate);
    
    setCurrentDate(date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }));
  };
  
  // Navigate to next day
  const goToNextDay = () => {
    const date = new Date(apiDateParam);
    date.setDate(date.getDate() + 1);
    
    const nextDate = date.toISOString().split('T')[0];
    setApiDateParam(nextDate);
    
    setCurrentDate(date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }));
  };

  return (
    <div className="content-section reports-section">
      <div className="report-header-actions">
        <div className="report-title-section">
          <i className="fas fa-clipboard-list"></i>
          <h2>Daily Transaction Log</h2>
        </div>
        
        <div className="report-actions">
          <button className="action-btn print-btn">
            <i className="fas fa-print"></i> Print
          </button>
          <button className="action-btn excel-btn">
            <i className="fas fa-file-excel"></i> Export
          </button>
        </div>
      </div>
      
      <div className="reports-container">
        {/* Date Navigation Card */}
        <div className="date-nav-card">
          <button className="date-nav-btn prev" onClick={goToPreviousDay}>
            <i className="fas fa-chevron-left"></i>
          </button>
          
          <div className="date-display">
            <div className="date-label">Current Date</div>
            <div className="current-date">
              <i className="far fa-calendar-alt"></i>
              <span>{currentDate}</span>
            </div>
          </div>
          
          <button className="date-nav-btn next" onClick={goToNextDay}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        
        {/* Summary Statistics Cards */}
        <div className="stats-container">
          <div className="stat-card in">
            <div className="stat-icon">
              <i className="fas fa-arrow-circle-down"></i>
            </div>
            <div className="stat-details">
              <div className="stat-value">{summary.itemsIn}</div>
              <div className="stat-label">Items In</div>
              <div className="stat-quantity">+{summary.totalQuantityIn} units</div>
            </div>
          </div>
          
          <div className="stat-card out">
            <div className="stat-icon">
              <i className="fas fa-arrow-circle-up"></i>
            </div>
            <div className="stat-details">
              <div className="stat-value">{summary.itemsOut}</div>
              <div className="stat-label">Items Out</div>
              <div className="stat-quantity">-{summary.totalQuantityOut} units</div>
            </div>
          </div>
          
          <div className="stat-card total">
            <div className="stat-icon">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <div className="stat-details">
              <div className="stat-value">{summary.totalTransactions}</div>
              <div className="stat-label">Total Transactions</div>
              <div className="stat-quantity">Daily Activity</div>
            </div>
          </div>
        </div>
        
        {/* Transactions Table Card */}
        <div className="table-card">
          <div className="table-header">
            <h3><i className="fas fa-history"></i> Transaction History</h3>
            <div className="table-actions">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input type="text" placeholder="Search transactions" />
              </div>
              <div className="filter-dropdown">
                <button className="filter-btn">
                  <i className="fas fa-filter"></i> Filter
                </button>
              </div>
            </div>
          </div>
          
          <div className="table-container">
            {loading ? (
              <div className="loading-container">
                <i className="fas fa-circle-notch fa-spin"></i>
                <p>Loading transactions...</p>
              </div>
            ) : (
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th><span>Time <i className="fas fa-sort"></i></span></th>
                    <th><span>Item <i className="fas fa-sort"></i></span></th>
                    <th><span>Transaction Type</span></th>
                    <th><span>Quantity <i className="fas fa-sort"></i></span></th>
                    <th><span>User <i className="fas fa-sort"></i></span></th>
                    <th><span>Notes</span></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length > 0 ? (
                    reports.map(report => (
                      <tr key={report.id}>
                        <td>
                          <div className="cell-with-icon">
                            <i className="far fa-clock"></i>
                            <span>{report.time}</span>
                          </div>
                        </td>
                        <td>
                          <div className="item-cell">
                            {report.item}
                          </div>
                        </td>
                        <td>
                          <span className={`transaction-badge ${report.transactionType === 'Stock In' ? 'stock-in' : 'stock-out'}`}>
                            <i className={`fas fa-${report.transactionType === 'Stock In' ? 'arrow-down' : 'arrow-up'}`}></i>
                            {report.transactionType}
                          </span>
                        </td>
                        <td>
                          <span className={`quantity-value ${report.quantity.includes('+') ? 'positive' : 'negative'}`}>
                            {report.quantity}
                          </span>
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">
                              {report.user.charAt(0)}
                            </div>
                            <span>{report.user}</span>
                          </div>
                        </td>
                        <td>
                          <div className="notes-cell">
                            {report.notes}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-state">
                      <td colSpan="6">
                        <div className="empty-container">
                          <i className="fas fa-clipboard-check"></i>
                          <p>No transactions recorded for this day.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          <div className="pagination-container">
            <div className="showing-info">
              <span>Showing</span>
              <select>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="records-info">
              <span>Showing 1 to {reports.length} out of {reports.length} records</span>
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn prev-btn" disabled>
                <i className="fas fa-chevron-left"></i>
              </button>
              <button className="pagination-btn page-btn active">1</button>
              <button className="pagination-btn next-btn" disabled>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReports;
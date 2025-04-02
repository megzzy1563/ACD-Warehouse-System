// src/components/common/DatePicker.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { formatDate, formatDateForInput } from '../../utils/formatters';

const DatePicker = ({ 
  id, 
  label, 
  value, 
  onChange, 
  required = false,
  placeholder = "Select date"
}) => {
  const { isDarkMode } = useContext(AppContext);
  const [showCalendar, setShowCalendar] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef(null);
  const inputRef = useRef(null);
  
  // Set initial values on component mount
  useEffect(() => {
    if (value) {
      // Value could be in DD/MM/YYYY or YYYY-MM-DD format
      if (value.includes('/')) {
        setDisplayValue(value);
        setInputValue(formatDateForInput(value));
      } else {
        const formattedDate = formatDate(value);
        setDisplayValue(formattedDate);
        setInputValue(value);
      }
      
      // Set current month based on selected date
      const parts = value.includes('/') ? value.split('/').reverse() : value.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // month is 0-indexed in JavaScript
      setCurrentMonth(new Date(year, month, 1));
    }
  }, [value]);
  
  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayIndex = firstDay.getDay();
    
    // Get number of days in month
    const daysInMonth = lastDay.getDate();
    
    // Calculate number of days to show from previous month
    const prevMonthDays = firstDayIndex;
    
    // Get last day of previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Generate days for calendar grid
    const calendarDays = [];
    
    // Previous month days
    for (let i = 0; i < prevMonthDays; i++) {
      calendarDays.push({
        day: prevMonthLastDay - prevMonthDays + i + 1,
        month: month - 1 < 0 ? 11 : month - 1,
        year: month - 1 < 0 ? year - 1 : year,
        currentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        day: i,
        month: month,
        year: year,
        currentMonth: true
      });
    }
    
    // Calculate how many days to show from next month to complete the grid
    const totalCells = Math.ceil((daysInMonth + prevMonthDays) / 7) * 7;
    const nextMonthDays = totalCells - (daysInMonth + prevMonthDays);
    
    // Next month days
    for (let i = 1; i <= nextMonthDays; i++) {
      calendarDays.push({
        day: i,
        month: month + 1 > 11 ? 0 : month + 1,
        year: month + 1 > 11 ? year + 1 : year,
        currentMonth: false
      });
    }
    
    return calendarDays;
  };
  
  // Handle date selection
  const handleDateSelect = (day) => {
    // Convert day, month, year to date string
    const date = new Date(day.year, day.month, day.day);
    const formattedDate = formatDate(date.toISOString().split('T')[0]);
    const inputFormattedDate = date.toISOString().split('T')[0];
    
    setDisplayValue(formattedDate);
    setInputValue(inputFormattedDate);
    
    if (onChange) {
      onChange(formattedDate);
    }
    
    setShowCalendar(false);
  };
  
  // Move to previous month
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Move to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Format month name
  const formatMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  // Check if a date is today
  const isToday = (day) => {
    const today = new Date();
    return day.day === today.getDate() &&
           day.month === today.getMonth() &&
           day.year === today.getFullYear();
  };
  
  // Check if a date is the currently selected date
  const isSelected = (day) => {
    if (!inputValue) return false;
    
    const selectedDate = new Date(inputValue);
    return day.day === selectedDate.getDate() &&
           day.month === selectedDate.getMonth() &&
           day.year === selectedDate.getFullYear();
  };

  return (
    <div className="form-group">
      {label && <label htmlFor={id}>{label} {required && <span className="required">*</span>}</label>}
      <div className="date-input-wrapper" ref={inputRef}>
        <input
          type="text"
          id={id}
          value={displayValue}
          onChange={(e) => setDisplayValue(e.target.value)}
          placeholder={placeholder}
          onClick={() => setShowCalendar(true)}
          readOnly
          required={required}
          style={{ cursor: 'pointer' }}
        />
        <div 
          className="date-input-label"
          onClick={() => setShowCalendar(true)}
          style={{ cursor: 'pointer' }}
        >
          <i className="fas fa-calendar-alt"></i>
        </div>
        
        {showCalendar && (
          <div 
            className="calendar-dropdown" 
            ref={calendarRef}
            style={{
              backgroundColor: isDarkMode ? '#16213e' : 'white',
              border: `1px solid ${isDarkMode ? '#0f3460' : '#eaeaea'}`,
              boxShadow: isDarkMode ? '0 6px 16px rgba(0, 0, 0, 0.2)' : '0 6px 16px rgba(0, 0, 0, 0.1)',
              zIndex: 1050
            }}
          >
            <div 
              className="calendar-header"
              style={{
                borderBottom: `1px solid ${isDarkMode ? '#0f3460' : '#eaeaea'}`
              }}
            >
              <button 
                className="prev-month" 
                onClick={prevMonth}
                style={{
                  color: isDarkMode ? '#b8b8b8' : '#555'
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <div 
                className="current-month"
                style={{
                  color: isDarkMode ? '#f0f0f0' : '#333'
                }}
              >
                {formatMonthName(currentMonth)}
              </div>
              <button 
                className="next-month" 
                onClick={nextMonth}
                style={{
                  color: isDarkMode ? '#b8b8b8' : '#555'
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            <div className="weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div 
                  key={day}
                  style={{
                    color: isDarkMode ? '#b8b8b8' : '#777'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="days">
              {generateCalendarDays().map((day, index) => {
                // Determine classes based on day state
                const isCurrentDay = isToday(day);
                const isSelectedDay = isSelected(day);
                const isCurrentMonth = day.currentMonth;
                
                return (
                  <div
                    key={index}
                    className={`day ${!isCurrentMonth ? 'other-month' : ''} ${
                      isCurrentDay ? 'today' : ''
                    } ${isSelectedDay ? 'selected' : ''}`}
                    onClick={() => handleDateSelect(day)}
                    style={{
                      color: !isCurrentMonth 
                        ? isDarkMode ? '#555' : '#bbb'
                        : isSelectedDay 
                          ? 'white' 
                          : isDarkMode ? '#f0f0f0' : '#333',
                      backgroundColor: isSelectedDay 
                        ? '#007bff' 
                        : 'transparent',
                      border: isCurrentDay && !isSelectedDay
                        ? '1px solid #007bff'
                        : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {day.day}
                  </div>
                );
              })}
            </div>
            <div 
              className="calendar-footer"
              style={{
                borderTop: `1px solid ${isDarkMode ? '#0f3460' : '#eaeaea'}`
              }}
            >
              <button 
                className="today-btn"
                onClick={() => {
                  const today = new Date();
                  handleDateSelect({
                    day: today.getDate(),
                    month: today.getMonth(),
                    year: today.getFullYear(),
                    currentMonth: 
                      today.getMonth() === currentMonth.getMonth() &&
                      today.getFullYear() === currentMonth.getFullYear()
                  });
                }}
                style={{
                  color: '#007bff',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
              <button 
                className="close-btn"
                onClick={() => setShowCalendar(false)}
                style={{
                  color: isDarkMode ? '#f0f0f0' : '#555',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .date-input-wrapper {
          position: relative;
          cursor: pointer;
        }
        
        .calendar-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 1050;
          width: 280px;
          border-radius: 8px;
          margin-top: 10px;
          animation: scaleIn 0.2s ease-in-out;
        }
        
        .calendar-dropdown::before {
          content: "";
          position: absolute;
          top: -8px;
          left: 20px;
          width: 16px;
          height: 16px;
          background-color: ${isDarkMode ? '#16213e' : 'white'};
          transform: rotate(45deg);
          border-top: 1px solid ${isDarkMode ? '#0f3460' : '#eaeaea'};
          border-left: 1px solid ${isDarkMode ? '#0f3460' : '#eaeaea'};
        }
        
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
        }
        
        .prev-month, .next-month {
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        
        .prev-month:hover, .next-month:hover {
          background-color: ${isDarkMode ? '#1f305e' : '#f0f2f5'};
        }
        
        .current-month {
          font-weight: 600;
          font-size: 14px;
        }
        
        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          padding: 8px 0;
          border-bottom: 1px solid ${isDarkMode ? '#0f3460' : '#eaeaea'};
        }
        
        .days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          padding: 8px;
        }
        
        .day {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 32px;
          font-size: 13px;
          cursor: pointer;
          border-radius: 4px;
          margin: 2px;
        }
        
        .day:hover:not(.other-month) {
          background-color: ${isDarkMode ? '#1f305e' : '#f0f2f5'};
        }
        
        .calendar-footer {
          display: flex;
          justify-content: space-between;
          padding: 12px;
        }
        
        .today-btn, .close-btn {
          background: none;
          border: none;
          font-size: 13px;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .today-btn:hover {
          background-color: ${isDarkMode ? 'rgba(0, 123, 255, 0.15)' : 'rgba(0, 123, 255, 0.1)'};
        }
        
        .close-btn:hover {
          background-color: ${isDarkMode ? '#1f305e' : '#f0f2f5'};
        }
        
        .required {
          color: #e74c3c;
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default DatePicker;
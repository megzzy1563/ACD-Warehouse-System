// src/components/Login.js
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import '../styles/LoginStyles.css';

const Login = () => {
  // Use the context for login, loading, error, and dark mode
  const { login, loading, error, isDarkMode, toggleDarkMode } = useContext(AppContext);
  
  // State for form credentials
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  
  // Additional state for login features
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle input changes 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials({
      ...credentials,
      [name]: value
    });
  };

  // Handle dark mode toggle
  const handleToggleDarkMode = () => {
    if (toggleDarkMode) {
      toggleDarkMode(!isDarkMode);
    }
  };

  // Handle form submission with API integration
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Handle "Remember me" functionality
    if (rememberMe) {
      localStorage.setItem('rememberedUser', credentials.email);
    } else {
      localStorage.removeItem('rememberedUser');
    }
    
    // Call the login function from context to authenticate
    await login(credentials);
  };

  // Check for remembered user on component mount
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      setCredentials(prev => ({
        ...prev,
        email: rememberedUser
      }));
      setRememberMe(true);
    }
  }, []);

  return (
    <div className={`login-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="login-content-wrapper">
        {/* Left column: Login Form */}
        <div className="login-form-column">
          <div className="login-logo-container">
            <img src="/assets/ACD Logo.png" alt="ACD Logo" className="logo" />
            <h2 className="app-name">ACD INVENTORY SYSTEM</h2>
          </div>
          
          <div className="login-card">
            <div className="login-card-header">
              <h2>Welcome Back</h2>
              <p>Please sign in to continue</p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="login-error">
                <i className="fas fa-exclamation-circle"></i>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="login-form">
              {/* Email Field */}
              <div className="form-group">
                <label htmlFor="email">
                  <i className="fas fa-envelope"></i>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
              </div>
              
              {/* Password Field */}
              <div className="form-group">
                <label htmlFor="password">
                  <i className="fas fa-lock"></i>
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <span 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </span>
                </div>
              </div>
              
              {/* Remember Me & Forgot Password */}
              <div className="login-options">
                <div className="remember-me">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  <label htmlFor="rememberMe">Remember me</label>
                </div>
                <a href="#forgot-password" className="forgot-password">
                  Forgot Password?
                </a>
              </div>
              
              {/* Login Button */}
              <button 
                type="submit" 
                className={`login-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Login
                  </>
                )}
              </button>
            </form>
          </div>
          
          {/* Theme Toggle */}
          <div className="login-theme-toggle">
            <button onClick={handleToggleDarkMode} className="theme-toggle-btn">
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
        
        {/* Right column: Image with enhanced effects */}
        <div className="login-image-column">
          <div className="light-effect"></div>
          <img 
            src="/assets/crawler.png" 
            alt="Construction Equipment" 
            className="login-background-image"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
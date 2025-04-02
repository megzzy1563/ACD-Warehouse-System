// src/App.js
import React, { useContext } from 'react';
import { AppContext } from './context/AppContext';

// Import components
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import DailyReports from './components/DailyReports';
import ScanItem from './components/ScanItem';
import Footer from './components/TempFooter';
import AddItemModal from './components/Modals/AddItemModal';
import EditProfileModal from './components/Modals/EditProfileModal';
import ViewItemModal from './components/Modals/ViewItemModal';
import ProfileDropdown from './components/Dropdowns/ProfileDropdown';
import NotificationDropdown from './components/Dropdowns/NotificationDropdown';

// Import styles
import './styles/App.css';
import './styles/ModalStyles.css';

function App() {
  const { activeSection, isDarkMode, isAuthenticated } = useContext(AppContext);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      <Sidebar />
      
      <div className="main-content">
        <Header />
        
        {activeSection === 'Dashboard' && <Dashboard />}
        {activeSection === 'Inventory' && <Inventory />}
        {activeSection === 'Daily Reports' && <DailyReports />}
        {activeSection === 'Scan Item' && <ScanItem />}
        
        <Footer />
      </div>
      
      {/* Modals - These are portal-style components that render at the document level */}
      <AddItemModal />
      <EditProfileModal />
      <ViewItemModal />
      <ProfileDropdown />
      <NotificationDropdown />
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { db } from './db/index';
import { initializeDatabaseWithSeedData, defaultSettings } from './db/seedData';
import { LanguageProvider } from './context/LanguageContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import BillingView from './views/BillingView';
import InvoicesView from './views/InvoicesView';
import StockManagementView from './views/StockManagementView';
import StockSheetView from './views/StockSheetView';
import CustomerLedgerView from './views/CustomerLedgerView';
import SupplierManagementView from './views/SupplierManagementView';
import ReturnsView from './views/ReturnsView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [settings, setSettings] = useState(defaultSettings);
  const [isDbReady, setIsDbReady] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'light';
  });

  // Authentication State (Username & Password: admin / admin)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedLocal = localStorage.getItem('marble_auth');
    const savedSession = sessionStorage.getItem('marble_auth');
    return !!(savedLocal || savedSession);
  });

  // Collapsible Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', next.toString());
      return next;
    });
  };

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('marble_auth');
    sessionStorage.removeItem('marble_auth');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      await initializeDatabaseWithSeedData();
      const loadedSettings = await db.settings.toArray();
      if (loadedSettings && loadedSettings.length > 0) {
        setSettings(loadedSettings[0]);
      }
      setIsDbReady(true);
    } catch (err) {
      console.error('Error initializing database:', err);
      setIsDbReady(true);
    }
  };

  if (!isDbReady) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--text-primary)'
      }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Initializing Marble Factory Database...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If not logged in, show the Login Page first!
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        settings={settings}
      />
    );
  }

  return (
    <LanguageProvider>
      <div className="app-container" data-theme={theme}>
      {/* Collapsible Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        settings={settings}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebar}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          settings={settings}
          theme={theme}
          toggleTheme={toggleTheme}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          onLogout={handleLogout}
        />

        <main className="view-content">
          {activeView === 'dashboard' && (
            <DashboardView setActiveView={setActiveView} settings={settings} />
          )}

          {activeView === 'billing' && (
            <BillingView setActiveView={setActiveView} settings={settings} />
          )}

          {activeView === 'invoices' && (
            <InvoicesView settings={settings} />
          )}

          {activeView === 'stock' && (
            <StockManagementView />
          )}

          {activeView === 'stock-sheet' && (
            <StockSheetView settings={settings} />
          )}

          {activeView === 'customers' && (
            <CustomerLedgerView />
          )}

          {activeView === 'suppliers' && (
            <SupplierManagementView />
          )}

          {activeView === 'returns' && (
            <ReturnsView />
          )}

          {activeView === 'settings' && (
            <SettingsView
              settings={settings}
              onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            />
          )}
        </main>
      </div>
    </div>
    </LanguageProvider>
  );
}

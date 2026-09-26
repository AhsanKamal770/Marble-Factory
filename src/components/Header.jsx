import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Clock,
  Database,
  Sun,
  Moon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserCheck
} from 'lucide-react';
import { exportDatabaseToJson } from '../db/backupService';

export default function Header({
  activeView,
  setActiveView,
  settings,
  theme,
  toggleTheme,
  isSidebarCollapsed,
  toggleSidebar,
  onLogout
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [backupMsg, setBackupMsg] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const titles = {
    'dashboard': { title: 'Factory Operations Overview', subtitle: 'Live overview of sales, inventory & khata balances' },
    'billing': { title: 'POS Billing & Invoicing', subtitle: 'Create new marble/tile sales invoice with dimension calculator' },
    'invoices': { title: 'Sales Invoices & History', subtitle: 'Search, filter, reprint 80mm receipts & collect pending dues' },
    'stock': { title: 'Marble & Tiles Stock Catalog', subtitle: 'Manage slabs, tiles, granites, dimensions and pricing' },
    'stock-sheet': { title: 'Stock Movement Sheet & Audit', subtitle: 'Live stock ledger, In/Out transaction movements & valuation' },
    'customers': { title: 'Customer Ledger & Retail Search', subtitle: 'Customer khata, outstanding udhaar balances & payment records' },
    'suppliers': { title: 'Supplier Purchases & Stock Intake', subtitle: 'Inward challans, truck shipments & supplier accounts' },
    'returns': { title: 'Stock Returns & Adjustments', subtitle: 'Sales return from customers & purchase returns to suppliers' },
    'settings': { title: 'System & Factory Settings', subtitle: 'Company profile, 80mm receipt templates & data backup' },
  };

  const currentInfo = titles[activeView] || { title: 'Marble Factory Suite', subtitle: 'Desktop Management' };

  const handleQuickBackup = async () => {
    const res = await exportDatabaseToJson();
    if (res.success) {
      setBackupMsg('Backup saved!');
      setTimeout(() => setBackupMsg(''), 3000);
    }
  };

  return (
    <header className="top-header">
      <div className="header-title-section">
        {/* Sidebar Collapse Toggle Button */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div>
          <h1 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            {currentInfo.title}
          </h1>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>{currentInfo.subtitle}</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          background: 'var(--bg-primary)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }} className="font-mono">
          <Clock size={14} className="text-accent" />
          <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <>
              <Moon size={15} style={{ color: '#2563eb' }} />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun size={15} style={{ color: '#38bdf8' }} />
              <span>Light</span>
            </>
          )}
        </button>

        {/* Quick Backup */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleQuickBackup}
          title="Quick Backup Database to JSON"
        >
          <Database size={14} />
          <span>{backupMsg || 'Backup'}</span>
        </button>

        {/* New Bill Button */}
        {activeView !== 'billing' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setActiveView('billing')}
          >
            <PlusCircle size={15} />
            <span>New Bill</span>
          </button>
        )}

        {/* User Pill & Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px 4px 10px',
          borderRadius: '8px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          marginLeft: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <UserCheck size={14} className="text-accent" />
            <span>Admin</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 6px', color: '#fb7185' }}
            title="Sign Out (Logout)"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

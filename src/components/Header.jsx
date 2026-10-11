import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Clock,
  Database,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserCheck,
  Globe
} from 'lucide-react';
import { exportDatabaseToJson } from '../db/backupService';
import { useLanguage } from '../context/LanguageContext';

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
  const { language, toggleLanguage, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [backupMsg, setBackupMsg] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickBackup = async () => {
    const res = await exportDatabaseToJson();
    if (res.success) {
      setBackupMsg(language === 'ur' ? 'محفوظ!' : 'Saved!');
      setTimeout(() => setBackupMsg(''), 3000);
    }
  };

  return (
    <header className="top-header">
      {/* Zone 1 (Left): Sidebar toggle & Page title */}
      <div className="header-title-section">
        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>

        <h1 style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          margin: 0,
          whiteSpace: 'nowrap'
        }}>
          Rana Abdullah Siddique Marble Factory
        </h1>
      </div>

      {/* Zone 2 (Center/Right): Subdued contextual info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

        {/* Subtle Language Toggle */}
        <button
          type="button"
          onClick={toggleLanguage}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease'
          }}
          title={language === 'en' ? 'اردو میں تبدیل کریں' : 'Switch to English'}
        >
          <Globe size={12} style={{ color: 'var(--accent-blue)' }} />
          <span>{language === 'en' ? 'EN' : 'اردو'}</span>
        </button>

        {/* Theme Toggle (Minimal clean icon button) */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        >
          {theme === 'light' ? (
            <Moon size={14} style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <Sun size={14} style={{ color: '#38bdf8' }} />
          )}
        </button>

        {/* User Menu */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          paddingLeft: '10px',
          borderLeft: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 700
          }}>
            A
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Admin</span>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 4px', color: '#94a3b8' }}
            title="Sign Out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}

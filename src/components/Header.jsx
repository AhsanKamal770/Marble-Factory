import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Calendar,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  Globe
} from 'lucide-react';
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
  const { language, toggleLanguage } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <header style={{
      height: '64px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 15,
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      {/* Left: Sidebar Hamburger + Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '520px' }}>
        <button
          type="button"
          onClick={toggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          title="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: '420px'
        }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: '#94a3b8',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder={language === 'ur' ? 'کچھ بھی تلاش کریں... (انوائس، گاہک، پروڈکٹ)' : 'Search anything... (e.g. invoice, customer, product)'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '38px',
              paddingRight: '14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: '#0f172a',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563eb';
              e.target.style.background = '#ffffff';
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.background = '#f8fafc';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Right: Date/Time + Notification + Theme + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Date and Time Widget */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#64748b',
          fontSize: '0.82rem',
          fontWeight: 500,
          borderRight: '1px solid #e2e8f0',
          paddingRight: '18px'
        }}>
          <Calendar size={15} style={{ color: '#2563eb' }} />
          <span>{formattedDate}</span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{formattedTime}</span>
        </div>

        {/* Notifications Icon with Red Badge */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            title="Notifications"
          >
            <Bell size={18} />
          </button>
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '16px',
            height: '16px',
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: '50%',
            fontSize: '0.62rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px #ffffff'
          }}>
            3
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} style={{ color: '#d97706' }} />}
        </button>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#475569',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Toggle Language"
        >
          <Globe size={13} style={{ color: '#2563eb' }} />
          <span>{language === 'en' ? 'EN' : 'اردو'}</span>
        </button>

        {/* Profile Pill Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 8px',
              borderRadius: '10px',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              R
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
              Rana Shahab
            </span>
            <ChevronDown size={14} style={{ color: '#64748b' }} />
          </button>

          {profileDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '44px',
              right: '0',
              width: '180px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              padding: '6px',
              zIndex: 30
            }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Rana Shahab</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Master Administrator</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setActiveView('settings');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  color: '#334155',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  color: '#ef4444',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

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
  Globe,
  Wallet
} from 'lucide-react';
import { exportDatabaseToJson } from '../db/backupService';
import { useLanguage } from '../context/LanguageContext';
import { getLiveCashInDrawer } from '../db/index';

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
  const [liveCash, setLiveCash] = useState(25000);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchLiveDrawer();
  }, [activeView]);

  const fetchLiveDrawer = async () => {
    try {
      const data = await getLiveCashInDrawer();
      setLiveCash(data.liveCash || 0);
    } catch {
      // fallback
    }
  };

  const titles = {
    'dashboard': {
      title: language === 'ur' ? 'ماربل فیکٹری جائزہ' : 'Karkhana Dashboard',
      subtitle: language === 'ur' ? 'لائیو سیلز، دراز کیش اور کھاتہ سمری' : 'Live sales, Roznamcha drawer cash & Digital Khata'
    },
    'billing': {
      title: language === 'ur' ? 'نیا بل بک (سیلز)' : 'Naya Bill Book (POS)',
      subtitle: language === 'ur' ? 'سوتر، اسکوائر فٹ اور برانڈڈ انوائس' : 'Sutar thickness & Sq.Ft marble/tile billing'
    },
    'invoices': {
      title: language === 'ur' ? 'بل بک ریکارڈ و پرنٹ' : 'Bill Book & Invoices',
      subtitle: language === 'ur' ? 'تمام پرانے بل، وصولی اور پرنٹ' : 'Search, 80mm thermal receipt reprint & Udhar dues'
    },
    'stock': {
      title: language === 'ur' ? 'ماربل و ٹائلز اسٹاک' : 'Marble & Tiles Stock',
      subtitle: language === 'ur' ? '4 سوتر درجہ بندی، کٹنگ سائز اور ریٹ' : 'Sutar categories (4, 6, 9, 14 sutar) & pricing'
    },
    'stock-sheet': {
      title: language === 'ur' ? 'اسٹاک لیجر و آڈٹ' : 'Stock Sheet & Audit',
      subtitle: language === 'ur' ? 'مال کی آمد و روانگی کا کھاتہ' : 'Stock ledger, In/Out movements & valuation'
    },
    'customers': {
      title: language === 'ur' ? 'ڈیجیٹل کھاتہ (گاہک)' : 'Digital Khata (Customers)',
      subtitle: language === 'ur' ? 'گاہکوں کا مکمل ادھار اور وصولی' : 'Customer ledger, Udhar balance & wasooli history'
    },
    'suppliers': {
      title: language === 'ur' ? 'سپلائر مال آمد' : 'Supplier Purchases',
      subtitle: language === 'ur' ? 'ٹرک و چالان کی انٹری' : 'Raw stone blocks, truck intake & supplier balance'
    },
    'returns': {
      title: language === 'ur' ? 'واپسی مال و کٹائی نقصان' : 'Wapsi & Factory Wastage',
      subtitle: language === 'ur' ? 'گاہک واپسی اور فیکٹری بریکیج' : 'Sales returns & bridge-cutter breakage logs'
    },
    'settings': {
      title: language === 'ur' ? 'فیکٹری ترتیبات و بیک اپ' : 'Factory Settings',
      subtitle: language === 'ur' ? 'رانا شہاب ماربل پروفائل اور ڈیٹا بیک اپ' : 'Rana Shahab profile, bill book terms & local backup'
    }
  };

  const currentInfo = titles[activeView] || {
    title: language === 'ur' ? 'رانا شہاب ماربل فیکٹری' : 'Rana Shahab Marble Factory',
    subtitle: 'ERP + POS System'
  };

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
          {activeView === 'dashboard' ? (language === 'ur' ? 'کارخانہ ڈیش بورڈ' : 'Karkhana Dashboard') : currentInfo.title}
        </h1>
      </div>

      {/* Zone 2 (Center/Right): Subdued contextual info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Compact Financial Indicator (Not a loud pill) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          lineHeight: 1.2,
          paddingRight: '12px',
          borderRight: '1px solid var(--border-color)'
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            {language === 'ur' ? 'دراز کیش (روزنامچہ)' : 'Draz Cash (Drawer)'}
          </span>
          <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Rs. {Number(liveCash).toLocaleString()}
          </span>
        </div>

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

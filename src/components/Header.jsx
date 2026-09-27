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

        <h1 style={{
          fontSize: '1.12rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
          whiteSpace: 'nowrap'
        }}>
          {currentInfo.title}
        </h1>
      </div>

      <div className="header-actions">
        {/* Live Cash in Drawer (Roznamcha Pill) */}
        <div
          title={t('drawer_live_total', 'Draz Mein Mojood Cash')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            color: '#059669',
            fontSize: '0.8rem',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
        >
          <Wallet size={13} className="text-emerald" />
          <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
            {language === 'ur' ? 'کیش دراز:' : 'Draz Cash:'}
          </span>
          <span className="font-mono" style={{ fontWeight: 800 }}>
            Rs. {Number(liveCash).toLocaleString()}
          </span>
        </div>

        {/* Urdu / English Language Toggle */}
        <button
          type="button"
          className="lang-toggle-btn"
          onClick={toggleLanguage}
          title={language === 'en' ? 'اردو میں تبدیل کریں' : 'Switch to English'}
        >
          <Globe size={13} style={{ color: 'var(--accent-blue)' }} />
          <span className={language === 'en' ? 'lang-pill-active' : 'lang-pill-inactive'}>
            EN
          </span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span className={language === 'ur' ? 'lang-pill-active' : 'lang-pill-inactive'}>
            اردو
          </span>
        </button>

        {/* Theme Toggle Button (Icon only) */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        >
          {theme === 'light' ? (
            <Moon size={15} style={{ color: '#2563eb' }} />
          ) : (
            <Sun size={15} style={{ color: '#38bdf8' }} />
          )}
        </button>

        {/* User Pill & Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 6px 3px 10px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <UserCheck size={13} className="text-accent" />
            <span>Admin</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="btn btn-ghost btn-sm"
            style={{ padding: '3px 5px', color: '#fb7185' }}
            title="Sign Out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}

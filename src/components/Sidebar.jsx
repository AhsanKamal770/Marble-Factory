import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Boxes,
  ClipboardList,
  Users,
  Truck,
  RotateCcw,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
  ChartColumn,
  UserCog,
  TrendingUp,
  Heart,
  HandHeart
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Logo from './Logo';

export default function Sidebar({
  activeView,
  setActiveView,
  settings,
  isCollapsed,
  toggleCollapse,
  onLogout
}) {
  const { language, t } = useLanguage();

  const navSections = [
    {
      title: language === 'ur' ? 'جائزہ' : 'OVERVIEW',
      items: [
        { id: 'dashboard', label: language === 'ur' ? 'ڈیش بورڈ' : 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: language === 'ur' ? 'سیلز و بلنگ' : 'SALES',
      items: [
        { id: 'billing', label: language === 'ur' ? 'نیا بل (POS)' : 'New Bill', icon: Receipt, highlight: true },
        { id: 'invoices', label: language === 'ur' ? 'بل بک ریکارڈ' : 'Bills & Invoices', icon: FileText },
        { id: 'customers', label: language === 'ur' ? 'گاہک کھاتہ' : 'Customers / Khata', icon: Users },
      ]
    },
    {
      title: language === 'ur' ? 'اسٹاک و یارڈ' : 'INVENTORY',
      items: [
        { id: 'stock', label: language === 'ur' ? 'ماربل و ٹائلز اسٹاک' : 'Marble & Tiles Stock', icon: Boxes },
        { id: 'stock-sheet', label: language === 'ur' ? 'اسٹاک شیٹ' : 'Stock Sheet', icon: ClipboardList },
        { id: 'suppliers', label: language === 'ur' ? 'سپلائر مال آمد' : 'Supplier Purchases', icon: Truck }
      ]
    },
    {
      title: language === 'ur' ? 'فیکٹری آپریشنز' : 'FACTORY',
      items: [
        { id: 'gate-pass', label: language === 'ur' ? 'رکشہ گیٹ پاس' : 'Gate Passes', icon: Truck },
        { id: 'daily-expenses', label: language === 'ur' ? 'روزانہ اخراجات' : 'Daily Expenses', icon: Wallet },
        { id: 'returns', label: language === 'ur' ? 'واپسی و نقصان' : 'Wapsi & Wastage', icon: RotateCcw }
      ]
    },
    
    
    {
      title: language === 'ur' ? 'رپورٹس و افرادی قوت' : 'REPORTS & WORKFORCE',
      items: [
        { id: 'sales-reports', label: language === 'ur' ? 'سیلز رپورٹس' : 'Sales Reports', icon: TrendingUp },
        { id: 'employees', label: language === 'ur' ? 'ملازمین و تنخواہ' : 'Employees & Payroll', icon: Users },
        { id: 'zakat', label: language === 'ur' ? 'زکوٰۃ فنڈ' : 'Zakat Fund', icon: Heart }
      ]
    },
    {
      title: language === 'ur' ? 'سسٹم' : 'SYSTEM',
      items: [
        { id: 'settings', label: language === 'ur' ? 'فیکٹری ترتیبات' : 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header" style={{ justifyContent: isCollapsed ? 'center' : 'space-between', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            className="sidebar-logo-icon"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Rana Marble & Tiles'}
            style={{ cursor: 'pointer', flexShrink: 0, width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Logo width={28} height={20} />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.15, textOverflow: 'ellipsis', overflow: 'hidden', margin: 0 }}>
                {language === 'ur' ? 'رانا ماربل' : 'Rana'}
              </h2>
              <span style={{ fontSize: '0.65rem', color: '#60a5fa', letterSpacing: '0.08em', fontWeight: 700 }}>
                {language === 'ur' ? 'ماربل و ٹائلز' : 'MARBLE & TILES'}
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapse}
            title="Collapse Sidebar"
            style={{ width: '24px', height: '24px' }}
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Grouped Navigation Links */}
      <nav className="sidebar-nav">
        {navSections.map((sec, sIdx) => (
          <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
            {!isCollapsed && (
              <div className="nav-section-label">
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'nav-item-collapsed' : ''}`}
                  onClick={() => setActiveView(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={15} className="nav-icon" />
                  {!isCollapsed && (
                    <>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      {item.highlight && !isActive && (
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '0.62rem',
                          background: 'rgba(59, 130, 246, 0.25)',
                          color: '#93c5fd',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 700
                        }}>
                          POS
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer with Collapse Toggle & Status / Logout */}
      <div className="sidebar-footer">
        {isCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleCollapse}
              title="Expand Sidebar"
              style={{ width: '36px', height: '36px' }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={onLogout}
              title="Logout (Sign Out)"
              style={{ width: '36px', height: '36px', color: '#fb7185' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }}></div>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Offline Active</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>User: admin</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="btn btn-ghost btn-sm"
              title="Sign Out"
              style={{ padding: '6px 8px', color: '#fb7185' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

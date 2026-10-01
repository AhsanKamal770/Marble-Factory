import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  Users,
  Truck,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileText,
  RotateCcw,
  Wallet,
  User
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
  const { language } = useLanguage();

  const mainNavItems = [
    { id: 'dashboard', label: language === 'ur' ? 'ڈیش بورڈ' : 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: language === 'ur' ? 'سیلز و بلنگ' : 'Sales & Billing', icon: Receipt, hasChevron: true },
    { id: 'stock', label: language === 'ur' ? 'اسٹاک و یارڈ' : 'Inventory', icon: Boxes, hasChevron: true },
    { id: 'customers', label: language === 'ur' ? 'گاہک کھاتہ' : 'Customer Management', icon: Users },
    { id: 'suppliers', label: language === 'ur' ? 'سپلائر مال آمد' : 'Supplier Management', icon: Truck },
    { id: 'sales-reports', label: language === 'ur' ? 'سیلز رپورٹس' : 'Reports', icon: TrendingUp, hasChevron: true },
    { id: 'employees', label: language === 'ur' ? 'افرادی قوت' : 'Users & Roles', icon: ShieldCheck },
    { id: 'settings', label: language === 'ur' ? 'ترتیبات' : 'Settings', icon: Settings }
  ];

  const factoryNavItems = [
    { id: 'gate-pass', label: language === 'ur' ? 'گیٹ پاس' : 'Gate Passes', icon: FileText },
    { id: 'daily-expenses', label: language === 'ur' ? 'روزانہ اخراجات' : 'Daily Expenses', icon: Wallet },
    { id: 'returns', label: language === 'ur' ? 'واپسی و نقصان' : 'Wapsi & Wastage', icon: RotateCcw }
  ];

  const handleNavClick = (id) => {
    setActiveView(id);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{
      width: isCollapsed ? '74px' : '260px',
      background: '#0b1626',
      borderRight: '1px solid #162438',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: isCollapsed ? '20px 12px' : '22px 18px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        borderBottom: '1px solid #162438'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          <div
            onClick={toggleCollapse}
            title="Rana Shahab Marble"
            style={{
              cursor: 'pointer',
              flexShrink: 0,
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}
          >
            <Logo width={30} height={24} />
          </div>

          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h2 style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                Rana Shahab Marble
              </h2>
              <span style={{
                fontSize: '0.68rem',
                color: '#64748b',
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}>
                Factory Management System
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapse}
            title="Collapse Sidebar"
            style={{ width: '26px', height: '26px', background: 'transparent', border: 'none', color: '#64748b' }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="sidebar-nav" style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <div
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'nav-item-collapsed' : ''}`}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.86rem',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? '#2563eb' : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={17} style={{ color: isActive ? '#ffffff' : '#94a3b8', flexShrink: 0 }} />
                {!isCollapsed && (
                  <>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {item.hasChevron && !isActive && (
                      <ChevronDown size={14} style={{ color: '#64748b' }} />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Section: FACTORY */}
        <div style={{ marginTop: '22px' }}>
          {!isCollapsed && (
            <div style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '1.5px',
              padding: '0 14px 8px',
              textTransform: 'uppercase'
            }}>
              FACTORY
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {factoryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'nav-item-collapsed' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.86rem',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    background: isActive ? '#2563eb' : 'transparent',
                    boxShadow: isActive ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={17} style={{ color: isActive ? '#ffffff' : '#94a3b8', flexShrink: 0 }} />
                  {!isCollapsed && (
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sidebar Footer with User Status & Sign Out */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid #162438',
        background: '#08101d'
      }}>
        {isCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleCollapse}
              title="Expand Sidebar"
              style={{ width: '32px', height: '32px' }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={onLogout}
              title="Sign Out"
              style={{ width: '32px', height: '32px', color: '#fb7185' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* User Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                flexShrink: 0
              }}>
                <User size={18} style={{ color: '#2563eb' }} />
                <span style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid #08101d'
                }} />
              </div>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>Hamza Nawaz</div>
                <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Admin</div>
              </div>
            </div>

            {/* Red Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '2px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.80rem',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseOut={(e) => e.currentTarget.style.color = '#ef4444'}
            >
              <LogOut size={15} style={{ color: '#ef4444' }} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

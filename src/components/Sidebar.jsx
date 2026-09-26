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
  Layers,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

export default function Sidebar({
  activeView,
  setActiveView,
  settings,
  isCollapsed,
  toggleCollapse,
  onLogout
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'POS Billing', icon: Receipt, highlight: true },
    { id: 'invoices', label: 'Invoices & Bills', icon: FileText },
    { id: 'stock', label: 'Stock Management', icon: Boxes },
    { id: 'stock-sheet', label: 'Stock Sheet & Audit', icon: ClipboardList },
    { id: 'customers', label: 'Customer Ledger', icon: Users },
    { id: 'suppliers', label: 'Supplier Purchases', icon: Truck },
    { id: 'returns', label: 'Stock Returns', icon: RotateCcw },
    { id: 'settings', label: 'Factory Settings', icon: Settings },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header" style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
          <div
            className="sidebar-logo-icon"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Marble & Tiles Factory'}
            style={{ cursor: 'pointer', flexShrink: 0 }}
          >
            <Layers size={22} />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {settings?.companyName?.split(' ')[0] || 'AL-MADINA'}
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#60a5fa', letterSpacing: '0.08em', fontWeight: 600 }}>
                MARBLE & TILES
              </span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button (Inside header when expanded) */}
        {!isCollapsed && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapse}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'nav-item-collapsed' : ''}`}
              onClick={() => setActiveView(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className="nav-icon" />
              {!isCollapsed && (
                <>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  {item.highlight && !isActive && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.68rem',
                      background: 'rgba(59, 130, 246, 0.25)',
                      color: '#93c5fd',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      NEW
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
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

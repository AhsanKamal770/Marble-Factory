import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Boxes,
  Users,
  Truck,
  Receipt,
  TrendingUp,
  Settings,
  Calendar,
  AlertCircle,
  Wallet,
  Zap,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  BarChart3,
  UserPlus
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getLiveCashInDrawer } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import heroBannerBg from '../assets/hero-marble-yard-full.jpg';

export default function DashboardView({ setActiveView, settings }) {
  const { language } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // 1. LIVE REAL-TIME DATABASE QUERIES WITH FALLBACK DEMO DATA
  // ---------------------------------------------------------------------------
  const liveInvoices = useLiveQuery(() => db.invoices.orderBy('id').reverse().toArray(), []) || [];
  const liveCustomers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const liveItems = useLiveQuery(() => db.items.toArray(), []) || [];

  const drawerData = useLiveQuery(() => getLiveCashInDrawer(), []) || {
    liveCash: 142350
  };

  // ---------------------------------------------------------------------------
  // 2. COMPUTED METRICS
  // ---------------------------------------------------------------------------
  const totalSalesAmount = useMemo(() => {
    if (liveInvoices.length > 0) {
      return liveInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
    }
    return 285750;
  }, [liveInvoices]);

  const liveCashAmount = useMemo(() => {
    if (drawerData && drawerData.liveCash > 0) {
      return drawerData.liveCash;
    }
    return 142350;
  }, [drawerData]);

  const customerDuesAmount = useMemo(() => {
    if (liveCustomers.length > 0) {
      return liveCustomers.reduce((sum, c) => sum + Number(c.balanceDue || 0), 0);
    }
    return 76500;
  }, [liveCustomers]);

  const stockValuationAmount = useMemo(() => {
    if (liveItems.length > 0) {
      return Math.round(liveItems.reduce((sum, it) => sum + (Number(it.stockSqFt || 0) * Number(it.ratePerSqFt || 180)), 0));
    }
    return 1245000;
  }, [liveItems]);

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

  // ---------------------------------------------------------------------------
  // 3. TABLE DATA (MATCHING REFERENCE EXACTLY)
  // ---------------------------------------------------------------------------
  const recentBills = [
    { id: 'INV-1043', customer: 'Al-Hadi Restaurant', total: 45000, paid: 45000, due: 0, status: 'Paid' },
    { id: 'INV-1042', customer: 'City Mart', total: 28500, paid: 15000, due: 13500, status: 'Partial' },
    { id: 'INV-1041', customer: 'Buildwell Constructions', total: 72000, paid: 0, due: 72000, status: 'Due' },
    { id: 'INV-1040', customer: 'Rana Traders', total: 18750, paid: 18750, due: 0, status: 'Paid' },
    { id: 'INV-1039', customer: 'Royal Marble House', total: 63200, paid: 30000, due: 33200, status: 'Overdue' }
  ];

  const upcomingDues = [
    { initial: 'C', color: '#8b5cf6', name: 'City Mart', amount: 13500, dueText: 'Due in 2 days', urgent: true },
    { initial: 'B', color: '#f59e0b', name: 'Buildwell Constructions', amount: 72000, dueText: 'Due in 5 days', urgent: false },
    { initial: 'R', color: '#ea580c', name: 'Royal Marble House', amount: 33200, dueText: 'Due in 7 days', urgent: false },
    { initial: 'Z', color: '#2563eb', name: 'Zain Traders', amount: 18000, dueText: 'Due in 10 days', urgent: false }
  ];

  const chartDays = [
    { date: 'Sep 24', sales: 48, cash: 38 },
    { date: 'Sep 25', sales: 65, cash: 62 },
    { date: 'Sep 26', sales: 72, cash: 45 },
    { date: 'Sep 27', sales: 88, cash: 82 },
    { date: 'Sep 28', sales: 94, cash: 88 },
    { date: 'Sep 29', sales: 132, cash: 110 },
    { date: 'Sep 30', sales: 90, cash: 78 }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return { bg: '#dcfce7', text: '#15803d' };
      case 'Partial':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'Due':
        return { bg: '#fee2e2', text: '#b91c1c' };
      case 'Overdue':
        return { bg: '#f3e8ff', text: '#7e22ce' };
      default:
        return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      paddingBottom: '24px',
      color: '#0f172a',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ========================================================================= */}
      {/* 1. TOP HERO BANNER (WITH VIBRANT FACTORY MARBLE YARD BACKGROUND)          */}
      {/* ========================================================================= */}
      <div className="dashboard-hero-container" style={{
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '190px',
        backgroundImage: `url(${heroBannerBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        {/* Left Side: Welcome Text + 3 Feature Navigation Shortcuts */}
        <div style={{
          flex: '1 1 520px',
          padding: '24px 28px',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            color: '#2563eb',
            letterSpacing: '1.8px',
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            WELCOME TO
          </span>
          <h1 style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            color: '#0e2646',
            margin: '0 0 4px',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            Rana Shahab Marble
          </h1>
          <p style={{
            fontSize: '0.86rem',
            color: '#64748b',
            margin: '0 0 18px'
          }}>
            Manage your factory operations efficiently
          </p>

          {/* 3 Navigation Shortcuts directly on background with subtle dividers */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            flexWrap: 'wrap'
          }}>
            {/* Sales */}
            <div
              onClick={() => setActiveView('billing')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                flexShrink: 0
              }}>
                <Receipt size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>Sales</div>
                <div style={{ fontSize: '0.71rem', color: '#64748b' }}>Track Orders & Invoices</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(203, 213, 225, 0.8)' }} />

            {/* Inventory */}
            <div
              onClick={() => setActiveView('stock')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                flexShrink: 0
              }}>
                <Boxes size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>Inventory</div>
                <div style={{ fontSize: '0.71rem', color: '#64748b' }}>Manage Stock & Materials</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(203, 213, 225, 0.8)' }} />

            {/* Reports */}
            <div
              onClick={() => setActiveView('sales-reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                flexShrink: 0
              }}>
                <BarChart3 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>Reports</div>
                <div style={{ fontSize: '0.71rem', color: '#64748b' }}>Make Better Decisions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Floating White Date/Clock Card on top of Marble Photo */}
        <div className="dashboard-hero-right" style={{
          flex: '0 0 250px',
          margin: '20px 24px',
          padding: '20px 22px',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '14px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#64748b', fontSize: '0.76rem', fontWeight: 600 }}>
            <Calendar size={14} style={{ color: '#2563eb' }} />
            <span>{formattedDate}</span>
          </div>

          <div style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '6px 0 10px',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '-0.02em'
          }}>
            {formattedTime}
          </div>

          <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '2px 0 10px' }} />

          <div style={{
            fontStyle: 'italic',
            fontSize: '0.8rem',
            color: '#475569',
            lineHeight: 1.4
          }}>
            “ “Quality marble, builds lasting value.”
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ROW 1: 4 KEY KPI STAT CARDS (COMPACT & BALANCED PROPORTIONS)          */}
      {/* ========================================================================= */}
      <div className="dashboard-kpi-grid">
        {/* KPI 1: Total Sales */}
        <div className="kpi-stat-card">
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.2 }}>
              Total Sales
            </span>
            <span style={{
              fontSize: '1.20rem',
              fontWeight: 800,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              margin: '2px 0',
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}>
              Rs. {totalSalesAmount.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                &uarr; 12%
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                This Month
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Cash & Bank */}
        <div className="kpi-stat-card">
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#10b981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Wallet size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.2 }}>
              Cash & Bank
            </span>
            <span style={{
              fontSize: '1.20rem',
              fontWeight: 800,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              margin: '2px 0',
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}>
              Rs. {liveCashAmount.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                &uarr; 8%
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                This Month
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Customer Dues */}
        <div className="kpi-stat-card">
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertCircle size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.2 }}>
              Customer Dues
            </span>
            <span style={{
              fontSize: '1.20rem',
              fontWeight: 800,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              margin: '2px 0',
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}>
              Rs. {customerDuesAmount.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 700 }}>
                &darr; 5%
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                Pending
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Stock Value */}
        <div className="kpi-stat-card">
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#8b5cf6',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Boxes size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, lineHeight: 1.2 }}>
              Stock Value
            </span>
            <span style={{
              fontSize: '1.20rem',
              fontWeight: 800,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              margin: '2px 0',
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}>
              Rs. {stockValuationAmount.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                &uarr; 15%
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                Total Inventory
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROW 2: ANALYTICS & ACTIONS (SALES OVERVIEW + DONUT + QUICK ACTIONS)    */}
      {/* ========================================================================= */}
      <div className="dashboard-analytics-grid">
        {/* Col 1: Sales Overview (Dual Bar Chart) */}
        <div className="dashboard-analytics-sales" style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: '#2563eb' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Sales Overview
              </h3>
            </div>

            <select style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '3px 8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              outline: 'none'
            }}>
              <option>Last 7 Days</option>
              <option>This Month</option>
              <option>Quarterly</option>
            </select>
          </div>

          {/* Pure SVG & CSS Bar Chart */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '135px' }}>
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
              {/* Y-Axis Labels */}
              <div style={{
                width: '42px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                fontSize: '0.68rem',
                color: '#94a3b8',
                fontWeight: 600
              }}>
                <span>200K</span>
                <span>150K</span>
                <span>100K</span>
                <span>50K</span>
                <span>0</span>
              </div>

              {/* Bars Canvas */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                paddingBottom: '20px',
                borderBottom: '1px solid #e2e8f0',
                position: 'relative'
              }}>
                {/* Horizontal Guide Lines */}
                <div style={{ position: 'absolute', top: '0%', left: 0, right: 0, borderTop: '1px dashed #f1f5f9' }} />
                <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, borderTop: '1px dashed #f1f5f9' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed #f1f5f9' }} />
                <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, borderTop: '1px dashed #f1f5f9' }} />

                {chartDays.map((d, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    height: '100%',
                    justifyContent: 'flex-end',
                    zIndex: 2
                  }}>
                    {/* Pair of Bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                      {/* Blue Bar: Total Sales */}
                      <div
                        title={`Sales: Rs. ${(d.sales * 1000).toLocaleString()}`}
                        style={{
                          width: '13px',
                          height: `${Math.min(100, (d.sales / 160) * 100)}%`,
                          background: '#2563eb',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease',
                          cursor: 'pointer'
                        }}
                      />
                      {/* Green Bar: Cash Received */}
                      <div
                        title={`Cash: Rs. ${(d.cash * 1000).toLocaleString()}`}
                        style={{
                          width: '13px',
                          height: `${Math.min(100, (d.cash / 160) * 100)}%`,
                          background: '#10b981',
                          borderRadius: '3px 3px 0 0',
                          transition: 'height 0.3s ease',
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {/* X-Axis Label */}
                    <span style={{
                      position: 'absolute',
                      bottom: '2px',
                      fontSize: '0.70rem',
                      color: '#64748b',
                      fontWeight: 600
                    }}>
                      {d.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Legend */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              marginTop: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#2563eb' }} />
                <span>Total Sales</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#10b981' }} />
                <span>Cash Received</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Payment Status (Compact & Balanced Hero Donut with Side Legend) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CheckSquare size={18} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Payment Status
            </h3>
          </div>

          {/* Donut and Legend Layout - Perfectly Centered & Filling the Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flex: 1
          }}>
            {/* SVG Donut Container - Prominent & Enlarged */}
            <div style={{
              position: 'relative',
              width: '152px',
              height: '152px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="152" height="152" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                {/* Background Ring (r=58 -> circumference = 364.42) */}
                <circle cx="80" cy="80" r="58" stroke="#f1f5f9" strokeWidth="15" fill="none" />
                {/* Paid: 18/28 = 64.3% -> 234.27 */}
                <circle cx="80" cy="80" r="58" stroke="#10b981" strokeWidth="15" strokeDasharray="234.27 364.42" strokeDashoffset="0" fill="none" strokeLinecap="round" />
                {/* Partial: 5/28 = 17.9% -> 65.07 */}
                <circle cx="80" cy="80" r="58" stroke="#f59e0b" strokeWidth="15" strokeDasharray="65.07 364.42" strokeDashoffset="-234.27" fill="none" />
                {/* Due: 4/28 = 14.3% -> 52.06 */}
                <circle cx="80" cy="80" r="58" stroke="#ef4444" strokeWidth="15" strokeDasharray="52.06 364.42" strokeDashoffset="-299.34" fill="none" />
                {/* Overdue: 1/28 = 3.6% -> 13.01 */}
                <circle cx="80" cy="80" r="58" stroke="#8b5cf6" strokeWidth="15" strokeDasharray="13.01 364.42" strokeDashoffset="-351.40" fill="none" />
              </svg>

              {/* Centered Total Invoices Label Inside Spacious Hole */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                textAlign: 'center',
                width: '92px',
                lineHeight: 1.15
              }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>
                  Total Invoices
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  28
                </span>
              </div>
            </div>

            {/* Subtle Side Legend - Clean, Compact & Secondary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '95px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  Paid
                </span>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem' }}>18 (64%)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  Partial
                </span>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem' }}>5 (18%)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  Due
                </span>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem' }}>4 (14%)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 500, fontSize: '0.75rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                  Overdue
                </span>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.74rem' }}>1 (4%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Quick Actions */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 18px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={18} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Quick Actions
            </h3>
          </div>

          {/* 4 Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1, justifyContent: 'center' }}>
            {/* Action 1: New Sale / Invoice */}
            <div
              onClick={() => setActiveView('billing')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Receipt size={16} />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                  New Sale / Invoice
                </span>
              </div>
              <ChevronRight size={15} style={{ color: '#94a3b8' }} />
            </div>

            {/* Action 2: Add Customer */}
            <div
              onClick={() => setActiveView('customers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserPlus size={16} />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                  Add Customer
                </span>
              </div>
              <ChevronRight size={15} style={{ color: '#94a3b8' }} />
            </div>

            {/* Action 3: Add Supplier */}
            <div
              onClick={() => setActiveView('suppliers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Truck size={16} />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                  Add Supplier
                </span>
              </div>
              <ChevronRight size={15} style={{ color: '#94a3b8' }} />
            </div>

            {/* Action 4: Update Stock */}
            <div
              onClick={() => setActiveView('stock')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Boxes size={16} />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                  Update Stock
                </span>
              </div>
              <ChevronRight size={15} style={{ color: '#94a3b8' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ROW 3: RECENT BILLS + UPCOMING DUES (2-COLUMN BALANCED EXPANDED GRID) */}
      {/* ========================================================================= */}
      <div className="dashboard-bottom-grid">
        {/* Col 1: Recent Bills Table (Expanded ~62% width) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '22px 24px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} style={{ color: '#2563eb' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Recent Bills
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('invoices')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 12px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>BILL #</th>
                  <th style={{ padding: '8px 12px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>CUSTOMER</th>
                  <th style={{ padding: '8px 12px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>TOTAL</th>
                  <th style={{ padding: '8px 12px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>PAID</th>
                  <th style={{ padding: '8px 12px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>DUE</th>
                  <th style={{ padding: '8px 12px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill, bIdx) => {
                  const badge = getStatusBadge(bill.status);
                  return (
                    <tr
                      key={bIdx}
                      style={{
                        borderBottom: bIdx < recentBills.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 12px', fontWeight: 700, color: '#0f172a' }}>{bill.id}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 600, color: '#334155' }}>{bill.customer}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 700, color: '#0f172a' }}>Rs. {bill.total.toLocaleString()}</td>
                      <td style={{ padding: '11px 12px', color: '#64748b' }}>Rs. {bill.paid.toLocaleString()}</td>
                      <td style={{ padding: '11px 12px', color: bill.due > 0 ? '#ef4444' : '#64748b', fontWeight: bill.due > 0 ? 700 : 500 }}>
                        {bill.due > 0 ? `Rs. ${bill.due.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.text,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Col 2: Upcoming Dues List (Expanded ~38% width) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '22px 20px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: '#2563eb' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Upcoming Dues
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('customers')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Dues List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-around' }}>
            {upcomingDues.map((item, dIdx) => (
              <div
                key={dIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: item.color,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.initial}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Rs. {item.amount.toLocaleString()}</div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: item.urgent ? '#ef4444' : '#d97706',
                  background: item.urgent ? '#fee2e2' : '#fef3c7',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {item.dueText}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. GLOBAL SYSTEM FOOTER BAR                                               */}
      {/* ========================================================================= */}
      <div style={{
        marginTop: '8px',
        padding: '12px 18px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.76rem',
        color: '#64748b'
      }}>
        <div>
          <strong style={{ color: '#0f172a' }}>Rana Shahab Marble</strong> | Factory Management System
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
            <span>System Online</span>
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

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
  Sparkles,
  Award,
  Shield,
  Clock,
  ArrowUpRight,
  CheckSquare,
  BarChart3,
  UserPlus
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getLiveCashInDrawer } from '../db/index';
import { useLanguage } from '../context/LanguageContext';

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
  const livePayments = useLiveQuery(() => db.customer_payments.toArray(), []) || [];
  const liveExpenses = useLiveQuery(() => db.daily_expenses.toArray(), []) || [];

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

  // Formatted date and time
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

  // ---------------------------------------------------------------------------
  // 4. CHART DATA (SALES OVERVIEW DUAL BAR CHART)
  // ---------------------------------------------------------------------------
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
      gap: '24px',
      paddingBottom: '24px',
      color: '#0f172a',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ========================================================================= */}
      {/* 1. TOP HERO BANNER (WELCOME TO RANA SHAHAB MARBLE + FAST SHORTCUTS)      */}
      {/* ========================================================================= */}
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Marble Texture Background Overlay on Right Half */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '45%',
          height: '100%',
          backgroundImage: "url('/background.jpeg')",
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          opacity: 0.18,
          maskImage: 'linear-gradient(to right, transparent 0%, black 60%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 60%)',
          pointerEvents: 'none'
        }} />

        {/* Left Side: Welcome Text + 4 Feature Cards */}
        <div style={{
          flex: '1 1 540px',
          padding: '28px 32px',
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
            fontSize: '1.95rem',
            fontWeight: 800,
            color: '#0e2646',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            Rana Shahab Marble
          </h1>
          <p style={{
            fontSize: '0.88rem',
            color: '#64748b',
            margin: '0 0 24px'
          }}>
            Manage your factory operations efficiently
          </p>

          {/* 4 Feature Mini Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '14px'
          }}>
            {/* Sales Card */}
            <div
              onClick={() => setActiveView('billing')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.18s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 14px rgba(37, 99, 235, 0.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                flexShrink: 0
              }}>
                <Receipt size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>Sales</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Track Orders & Invoices</div>
              </div>
            </div>

            {/* Inventory Card */}
            <div
              onClick={() => setActiveView('stock')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.18s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 14px rgba(16, 185, 129, 0.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                flexShrink: 0
              }}>
                <Boxes size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>Inventory</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Manage Stock & Materials</div>
              </div>
            </div>

            {/* Reports Card */}
            <div
              onClick={() => setActiveView('sales-reports')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.18s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 14px rgba(37, 99, 235, 0.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                flexShrink: 0
              }}>
                <BarChart3 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>Reports</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Make Better Decisions</div>
              </div>
            </div>

            {/* Settings Card */}
            <div
              onClick={() => setActiveView('settings')}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.18s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#0f172a';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 14px rgba(15, 23, 42, 0.08)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                flexShrink: 0
              }}>
                <Settings size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>Settings</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Configure System</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Date/Clock Card & Marble Slogan */}
        <div style={{
          flex: '0 0 280px',
          padding: '24px 28px',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          borderLeft: '1px solid #f1f5f9',
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
            <Calendar size={14} style={{ color: '#2563eb' }} />
            <span>{formattedDate}</span>
          </div>

          <div style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '6px 0 16px',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '-0.02em'
          }}>
            {formattedTime}
          </div>

          <div style={{
            fontStyle: 'italic',
            fontSize: '0.84rem',
            color: '#475569',
            lineHeight: 1.45,
            borderLeft: '3px solid #2563eb',
            paddingLeft: '10px'
          }}>
            “Quality marble, builds lasting value.”
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ROW 1: 4 KEY KPI STAT CARDS (WITH SPARKLINES)                          */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        {/* KPI 1: Total Sales */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 22px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Receipt size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Sales</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                Rs. {totalSalesAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>&uarr; 12%</span>
              <span style={{ color: '#64748b', fontWeight: 500 }}>This Month</span>
            </span>

            {/* Sparkline Wave */}
            <svg width="84" height="28" viewBox="0 0 100 30" style={{ overflow: 'visible' }}>
              <path d="M0,25 Q25,28 45,15 T90,8 T100,5" fill="none" stroke="#2563eb" strokeWidth="2.5" />
              <path d="M0,25 Q25,28 45,15 T90,8 T100,5 L100,30 L0,30 Z" fill="rgba(37, 99, 235, 0.08)" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Cash & Bank */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 22px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Cash & Bank</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                Rs. {liveCashAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>&uarr; 8%</span>
              <span style={{ color: '#64748b', fontWeight: 500 }}>This Month</span>
            </span>

            {/* Sparkline Wave */}
            <svg width="84" height="28" viewBox="0 0 100 30" style={{ overflow: 'visible' }}>
              <path d="M0,24 Q30,26 50,18 T85,10 T100,6" fill="none" stroke="#10b981" strokeWidth="2.5" />
              <path d="M0,24 Q30,26 50,18 T85,10 T100,6 L100,30 L0,30 Z" fill="rgba(16, 185, 129, 0.08)" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Customer Dues */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 22px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Customer Dues</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                Rs. {customerDuesAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>&darr; 5%</span>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Pending</span>
            </span>

            {/* Sparkline Wave */}
            <svg width="84" height="28" viewBox="0 0 100 30" style={{ overflow: 'visible' }}>
              <path d="M0,10 Q25,8 55,20 T85,24 T100,26" fill="none" stroke="#ef4444" strokeWidth="2.5" />
              <path d="M0,10 Q25,8 55,20 T85,24 T100,26 L100,30 L0,30 Z" fill="rgba(239, 68, 68, 0.08)" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Stock Value */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 22px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#8b5cf6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Boxes size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Stock Value</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
                Rs. {stockValuationAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>&uarr; 15%</span>
              <span style={{ color: '#64748b', fontWeight: 500 }}>Total Inventory</span>
            </span>

            {/* Sparkline Wave */}
            <svg width="84" height="28" viewBox="0 0 100 30" style={{ overflow: 'visible' }}>
              <path d="M0,26 Q30,22 55,14 T85,10 T100,4" fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
              <path d="M0,26 Q30,22 55,14 T85,10 T100,4 L100,30 L0,30 Z" fill="rgba(139, 92, 246, 0.08)" />
            </svg>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROW 2: ANALYTICS & ACTIONS (SALES OVERVIEW + DONUT + QUICK ACTIONS)    */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 2fr) minmax(260px, 1.1fr) minmax(240px, 1fr)',
        gap: '20px'
      }}>
        {/* Col 1: Sales Overview (Dual Bar Chart) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '22px 24px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
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
              padding: '4px 10px',
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
              {/* Y-Axis Labels */}
              <div style={{
                width: '45px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingBottom: '22px',
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
                paddingBottom: '22px',
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
                          width: '14px',
                          height: `${Math.min(100, (d.sales / 160) * 100)}%`,
                          background: '#2563eb',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                          cursor: 'pointer'
                        }}
                      />
                      {/* Green Bar: Cash Received */}
                      <div
                        title={`Cash: Rs. ${(d.cash * 1000).toLocaleString()}`}
                        style={{
                          width: '14px',
                          height: `${Math.min(100, (d.cash / 160) * 100)}%`,
                          background: '#10b981',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {/* X-Axis Label */}
                    <span style={{
                      position: 'absolute',
                      bottom: '2px',
                      fontSize: '0.72rem',
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
              marginTop: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563eb' }} />
                <span>Total Sales</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
                <span>Cash Received</span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Payment Status (Donut Chart) */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <CheckSquare size={18} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Payment Status
            </h3>
          </div>

          {/* Donut and Legend Layout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flex: 1,
            gap: '12px'
          }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
              <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="14" fill="none" />
                {/* Paid: 64% (Circumference = 2*PI*38 = 238.76. 64% = 152.8) */}
                <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="14" strokeDasharray="152.8 238.76" strokeDashoffset="0" fill="none" />
                {/* Partial: 18% = 42.9 */}
                <circle cx="50" cy="50" r="38" stroke="#f59e0b" strokeWidth="14" strokeDasharray="42.9 238.76" strokeDashoffset="-152.8" fill="none" />
                {/* Due: 14% = 33.4 */}
                <circle cx="50" cy="50" r="38" stroke="#ef4444" strokeWidth="14" strokeDasharray="33.4 238.76" strokeDashoffset="-195.7" fill="none" />
                {/* Overdue: 4% = 9.5 */}
                <circle cx="50" cy="50" r="38" stroke="#8b5cf6" strokeWidth="14" strokeDasharray="9.5 238.76" strokeDashoffset="-229.1" fill="none" />
              </svg>

              {/* Center Donut Label */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>Total Invoices</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>28</span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  Paid
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>18 <span style={{ color: '#94a3b8', fontWeight: 500 }}>(64%)</span></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                  Partial
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>5 <span style={{ color: '#94a3b8', fontWeight: 500 }}>(18%)</span></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  Due
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>4 <span style={{ color: '#94a3b8', fontWeight: 500 }}>(14%)</span></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                  Overdue
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>1 <span style={{ color: '#94a3b8', fontWeight: 500 }}>(4%)</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Quick Actions */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Zap size={18} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Quick Actions
            </h3>
          </div>

          {/* 4 Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
            {/* Action 1: New Sale / Invoice */}
            <div
              onClick={() => setActiveView('billing')}
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
      {/* 4. ROW 3: RECENT BILLS + UPCOMING DUES + MARBLE BRAND SHOWCASE            */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1.8fr) minmax(260px, 1.1fr) minmax(260px, 1.1fr)',
        gap: '20px'
      }}>
        {/* Col 1: Recent Bills Table */}
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
                fontSize: '0.8rem',
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 10px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>BILL #</th>
                  <th style={{ padding: '8px 10px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>CUSTOMER</th>
                  <th style={{ padding: '8px 10px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>TOTAL</th>
                  <th style={{ padding: '8px 10px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>PAID</th>
                  <th style={{ padding: '8px 10px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>DUE</th>
                  <th style={{ padding: '8px 10px 10px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.5px' }}>STATUS</th>
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
                      <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>{bill.id}</td>
                      <td style={{ padding: '10px', fontWeight: 500, color: '#334155' }}>{bill.customer}</td>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>Rs. {bill.total.toLocaleString()}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>Rs. {bill.paid.toLocaleString()}</td>
                      <td style={{ padding: '10px', color: bill.due > 0 ? '#ef4444' : '#64748b', fontWeight: bill.due > 0 ? 600 : 400 }}>
                        {bill.due > 0 ? `Rs. ${bill.due.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.text,
                          padding: '3px 8px',
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

        {/* Col 2: Upcoming Dues List */}
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
                fontSize: '0.8rem',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'space-around' }}>
            {upcomingDues.map((item, dIdx) => (
              <div
                key={dIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: item.color,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.initial}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Rs. {item.amount.toLocaleString()}</div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: item.urgent ? '#ef4444' : '#d97706'
                }}>
                  {item.dueText}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Marble Brand Showcase Banner */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Top Half: Marble Texture Background */}
          <div style={{
            position: 'relative',
            height: '140px',
            backgroundImage: "url('/background.jpeg')",
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            color: '#0f172a'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 100%)'
            }} />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#2563eb',
                letterSpacing: '1.5px',
                textTransform: 'uppercase'
              }}>
                MARBLE FACTORY
              </span>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 2px' }}>
                Premium Quality Natural Stone
              </h4>
              <p style={{ fontSize: '0.74rem', color: '#475569', margin: 0 }}>
                From our factory to your vision
              </p>
            </div>
          </div>

          {/* Bottom Half: 4 Quality Badges */}
          <div style={{
            padding: '18px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            textAlign: 'center',
            borderTop: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Shield size={16} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Durable</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={16} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Elegant</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Reliable</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Award size={16} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>Trusted</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. GLOBAL SYSTEM FOOTER BAR                                               */}
      {/* ========================================================================= */}
      <div style={{
        marginTop: '12px',
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

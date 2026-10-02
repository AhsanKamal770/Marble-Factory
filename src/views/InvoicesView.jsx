import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Printer,
  Trash2,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Boxes,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Phone,
  Filter
} from 'lucide-react';
import { db, adjustItemStock } from '../db/index';
import BillPrintModal from '../components/BillPrintModal';
import PaymentCollectionModal from '../components/PaymentCollectionModal';
import GlobalPagination from '../components/GlobalPagination';
import { useLanguage } from '../context/LanguageContext';

export default function InvoicesView({ settings }) {
  const { language } = useLanguage();
  
  // Filter and Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'WALKIN' | 'REGISTERED'

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection & Modal States
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. LIVE DATABASE QUERY (Real Live Data)
  // ---------------------------------------------------------------------------
  const invoices = useLiveQuery(async () => {
    const all = await db.invoices.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];

  // ---------------------------------------------------------------------------
  // 2. LIVE KPI STATS DERIVATION
  // ---------------------------------------------------------------------------
  const stats = useMemo(() => {
    const totalCount = invoices.length;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    let thisWeekCount = 0;
    let thisWeekSales = 0;
    let grandTotalSum = 0;
    let paidSum = 0;
    let dueSum = 0;

    invoices.forEach((inv) => {
      const g = Number(inv.grandTotal || 0);
      const p = Number(inv.paidAmount || 0);
      const d = Number(inv.balanceDue || 0);
      const invDate = new Date(inv.date || inv.createdAt || 0);

      grandTotalSum += g;
      paidSum += p;
      dueSum += d;

      if (invDate >= oneWeekAgo) {
        thisWeekCount++;
        thisWeekSales += g;
      }
    });

    const paidPct = grandTotalSum > 0 ? Math.round((paidSum / grandTotalSum) * 100) : 0;
    const pendingPct = grandTotalSum > 0 ? Math.round((dueSum / grandTotalSum) * 100) : 0;
    const thisWeekPct = grandTotalSum > 0 ? Math.round((thisWeekSales / grandTotalSum) * 100) : 0;

    return {
      totalCount,
      thisWeekCount,
      grandTotalSum,
      thisWeekSales,
      thisWeekPct,
      paidSum,
      dueSum,
      paidPct,
      pendingPct
    };
  }, [invoices]);

  // ---------------------------------------------------------------------------
  // 3. FILTERING & SEARCHING
  // ---------------------------------------------------------------------------
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = now.toISOString().slice(0, 7);
    const thisYearStr = now.getFullYear().toString();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return invoices.filter((inv) => {
      // 1. Search Query
      const query = searchTerm.trim().toLowerCase();
      if (query) {
        const matchesNo = inv.invoiceNo?.toLowerCase().includes(query);
        const matchesCust = inv.customerName?.toLowerCase().includes(query);
        const matchesPhone = inv.customerPhone?.includes(query);
        if (!matchesNo && !matchesCust && !matchesPhone) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        const invStatus = (inv.paymentStatus || '').toLowerCase();
        const target = statusFilter.toLowerCase();
        if (target === 'paid' && invStatus !== 'paid') return false;
        if (target === 'partial' && invStatus !== 'half paid' && invStatus !== 'partial') return false;
        if (target === 'unpaid' && invStatus !== 'pending' && invStatus !== 'unpaid' && invStatus !== 'due') return false;
      }

      // 3. Date Range Filter
      if (dateFilter !== 'ALL') {
        const rawDate = inv.date || inv.createdAt || '';
        const invDateObj = new Date(rawDate);

        if (dateFilter === 'TODAY') {
          if (!rawDate.startsWith(todayStr)) return false;
        } else if (dateFilter === 'WEEK') {
          if (invDateObj < oneWeekAgo) return false;
        } else if (dateFilter === 'MONTH') {
          if (!rawDate.startsWith(thisMonthStr)) return false;
        } else if (dateFilter === 'YEAR') {
          if (!rawDate.startsWith(thisYearStr)) return false;
        }
      }

      // 4. Category / Customer Type Filter
      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'WALKIN' && inv.customerId) return false;
        if (categoryFilter === 'REGISTERED' && !inv.customerId) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter, dateFilter, categoryFilter]);

  // ---------------------------------------------------------------------------
  // 4. PAGINATION (Prevents UI Freeze on Large Datasets)
  // ---------------------------------------------------------------------------
  const totalRecords = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  
  // Ensure valid current page
  const activePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize;
    return filteredInvoices.slice(startIndex, startIndex + pageSize);
  }, [filteredInvoices, activePage, pageSize]);

  // Handle Reset Filter
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setCategoryFilter('ALL');
    setCurrentPage(1);
  };

  // ---------------------------------------------------------------------------
  // 5. ACTION HANDLERS
  // ---------------------------------------------------------------------------
  const handlePrint = (inv) => {
    setSelectedInvoice(inv);
    setIsPrintModalOpen(true);
  };

  const handleCollectPayment = async (inv) => {
    if (inv.customerId) {
      const cust = await db.customers.get(inv.customerId);
      if (cust) {
        setSelectedCustomerForPayment(cust);
        setIsPaymentOpen(true);
        return;
      }
    }
    // For walk-in customer
    setSelectedCustomerForPayment({
      id: null,
      name: inv.customerName,
      balanceDue: inv.balanceDue,
      totalBilled: inv.grandTotal,
      totalPaid: inv.paidAmount
    });
    setIsPaymentOpen(true);
  };

  const handleDeleteInvoice = async (inv) => {
    const msg = language === 'ur'
      ? `کیا آپ واقعی بل نمبر #${inv.invoiceNo} منسوخ کرنا چاہتے ہیں؟ اس سے تمام آئٹمز کا اسٹاک واپس گودام میں جمع ہو جائے گا۔`
      : `Are you sure you want to void invoice #${inv.invoiceNo}? This will return all ${inv.items?.length || 0} items back to inventory stock.`;
    
    if (!window.confirm(msg)) return;

    try {
      await db.transaction('rw', [db.invoices, db.items, db.customers, db.stock_movements], async () => {
        // Return stock back to inventory
        for (const item of inv.items || []) {
          if (item.itemId) {
            await adjustItemStock(
              item.itemId,
              Number(item.totalSqFt || item.sqFt || 0),
              Number(item.boxes || 0),
              Number(item.pieces || 0),
              'Adjustment',
              inv.invoiceNo,
              `Voided Invoice #${inv.invoiceNo} - Stock Restored`
            );
          }
        }

        // Adjust customer balance
        if (inv.customerId) {
          const cust = await db.customers.get(inv.customerId);
          if (cust) {
            await db.customers.update(inv.customerId, {
              totalBilled: Math.max(0, (Number(cust.totalBilled) || 0) - Number(inv.grandTotal || 0)),
              totalPaid: Math.max(0, (Number(cust.totalPaid) || 0) - Number(inv.paidAmount || 0)),
              balanceDue: Math.max(0, (Number(cust.balanceDue) || 0) - Number(inv.balanceDue || 0))
            });
          }
        }

        await db.invoices.delete(inv.id);
      });
    } catch (err) {
      alert('Error deleting invoice: ' + err.message);
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoiceIds(paginatedInvoices.map((inv) => inv.id));
    } else {
      setSelectedInvoiceIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper date/time formatter
  const formatDateTime = (dateStr) => {
    if (!dateStr) return { dateStr: '-', timeStr: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { dateStr, timeStr: '' };
      const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { dateStr: datePart, timeStr: timePart };
    } catch (e) {
      return { dateStr, timeStr: '' };
    }
  };

  // Status Badge Renderer matching the UI mockup
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 700,
          background: '#dcfce7',
          color: '#15803d'
        }}>
          Paid
        </span>
      );
    }
    if (s === 'half paid' || s === 'partial' || s === 'partially paid') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 700,
          background: '#fef3c7',
          color: '#b45309'
        }}>
          Partial
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 700,
        background: '#fee2e2',
        color: '#b91c1c'
      }}>
        {language === 'ur' ? 'بقایا' : 'Overdue'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1440px', margin: '0 auto' }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER SECTION (Integrated as part of the main view body) */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 4px 10px 4px',
        minHeight: '84px',
        overflow: 'hidden'
      }}>
        {/* Left: Sales Breadcrumb + Title + Subtitle */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#2563eb',
            marginBottom: '4px',
            display: 'inline-block'
          }}>
            {language === 'ur' ? 'سیلز' : 'Sales'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '13px',
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              flexShrink: 0
            }}>
              <FileText size={24} />
            </div>

            <div>
              <h1 style={{
                fontSize: '1.7rem',
                fontWeight: 800,
                color: 'var(--text-primary, #0f172a)',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                {language === 'ur' ? 'بلز اور انوائسز' : 'Bills & Invoices'}
              </h1>
              <p style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary, #64748b)',
                margin: '2px 0 0 0',
                fontWeight: 500
              }}>
                {language === 'ur' ? 'گاہکوں کے بلز اور ادھار وصولی کا انتظام' : 'Manage your customer invoices and track payments'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Background Marble Image extending seamlessly across the header */}
        <div style={{
          position: 'absolute',
          right: '0',
          top: '-15px',
          bottom: '-15px',
          width: '50%',
          maxWidth: '520px',
          backgroundImage: `url('./invoice_background.jpg'), url('/invoice_background.jpg'), url('./invoice_background.jpeg'), url('/invoice_background.jpeg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
          opacity: 0.95,
          borderRadius: '14px'
        }} />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 2. TOP 4 KPI CARDS (Real Live Data & Calculations)                        */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* Card 1: Total Invoices */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <FileText size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Invoices</span>
              <span className="kpi-metric-label-ur">(کل رسیدیں)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              {stats.totalCount}
            </div>
          </div>
        </div>

        {/* Card 2: Total Amount */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <Wallet size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Total Amount</span>
              <span className="kpi-metric-label-ur">(کل رقم)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {stats.grandTotalSum.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 3: Paid */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon indigo">
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Paid</span>
              <span className="kpi-metric-label-ur">(ادا شدہ)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {stats.paidSum.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Pending */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber">
            <Clock size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Pending</span>
              <span className="kpi-metric-label-ur">(زیر التوا)</span>
            </div>
            <div className="kpi-metric-value font-mono">
              Rs. {stats.dueSum.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. FILTER & SEARCH CONTROL BAR                                            */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '14px',
        padding: '12px 16px',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={language === 'ur' ? 'بل نمبر، گاہک کا نام یا فون نمبر تلاش کریں...' : 'Search by invoice #, customer name, or phone...'}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '0.84rem',
              outline: 'none',
              background: 'var(--bg-input, #ffffff)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Dropdowns Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Date Range Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px',
            padding: '4px 10px',
            background: 'var(--bg-card, #ffffff)'
          }}>
            <Calendar size={15} style={{ color: '#2563eb' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Date Range</span>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0,
                  margin: 0
                }}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
                <option value="YEAR">This Year</option>
              </select>
            </div>
          </div>

          {/* Status Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px',
            padding: '4px 10px',
            background: 'var(--bg-card, #ffffff)'
          }}>
            <Layers size={15} style={{ color: '#2563eb' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0,
                  margin: 0
                }}
              >
                <option value="ALL">All</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid / Due</option>
              </select>
            </div>
          </div>

          {/* Category / Type Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px',
            padding: '4px 10px',
            background: 'var(--bg-card, #ffffff)'
          }}>
            <Boxes size={15} style={{ color: '#2563eb' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Category</span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0,
                  margin: 0
                }}
              >
                <option value="ALL">All Accounts</option>
                <option value="REGISTERED">Registered Customers</option>
                <option value="WALKIN">Walk-in Customers</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            title={language === 'ur' ? 'فلٹرز ری سیٹ کریں' : 'Reset all filters'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--bg-card, #ffffff)',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-primary, #f1f5f9)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card, #ffffff)'; }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. SALES INVOICES REGISTER TABLE (Without Grand Total Column)            */}
      {/* ------------------------------------------------------------------------- */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '16px',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden'
      }}>
        {/* Table Title Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #f1f5f9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
            <FileText size={18} style={{ color: '#2563eb' }} />
            <span>{language === 'ur' ? `سیلز انوائس رجسٹر (${filteredInvoices.length})` : `Sales Invoices Register (${filteredInvoices.length})`}</span>
          </div>

          {/* Page size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Data Table (100% Fit, No Horizontal Scrolling) */}
        <div className="global-table-scroll">
          <table className="global-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 4px', width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={paginatedInvoices.length > 0 && paginatedInvoices.every((inv) => selectedInvoiceIds.includes(inv.id))}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 6px', width: '85px' }}>{language === 'ur' ? 'بل نمبر' : 'INVOICE #'}</th>
                <th style={{ padding: '10px 6px', width: '105px' }}>{language === 'ur' ? 'تاریخ و وقت' : 'DATE & TIME'}</th>
                <th style={{ padding: '10px 8px' }}>{language === 'ur' ? 'خریدار / کھاتہ' : 'CUSTOMER / ACCOUNT'}</th>
                <th style={{ padding: '10px 4px', width: '50px', textAlign: 'center' }}>{language === 'ur' ? 'آئٹم' : 'ITEMS'}</th>
                <th style={{ padding: '10px 6px', width: '90px', textAlign: 'right' }}>{language === 'ur' ? 'نقد وصولی' : 'PAID'}</th>
                <th style={{ padding: '10px 6px', width: '90px', textAlign: 'right' }}>{language === 'ur' ? 'بقایا ادھار' : 'BALANCE'}</th>
                <th style={{ padding: '10px 4px', width: '75px', textAlign: 'center' }}>{language === 'ur' ? 'اسٹیٹس' : 'STATUS'}</th>
                <th style={{ padding: '10px 4px', width: '85px', textAlign: 'center' }}>{language === 'ur' ? 'ایکشن' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{language === 'ur' ? 'کوئی انوائس ریکارڈ نہیں ملا۔' : 'No invoices match your filter criteria.'}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Try clearing filters or creating a new bill from Billing POS.</div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const { dateStr, timeStr } = formatDateTime(inv.date || inv.createdAt);
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  const isDue = Number(inv.balanceDue || 0) > 0;

                  return (
                    <tr
                      key={inv.id}
                      className={isSelected ? 'active-row' : ''}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(inv.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Invoice # */}
                      <td style={{ padding: '8px 6px', fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap', fontSize: '0.8rem' }} className="font-mono">
                        {inv.invoiceNo}
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>{dateStr}</div>
                        {timeStr && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>{timeStr}</div>}
                      </td>

                      {/* Customer / Account */}
                      <td style={{ padding: '8px 8px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.83rem', lineHeight: 1.2 }}>{inv.customerName || (language === 'ur' ? 'عام گاہک (Walk-in)' : 'Walk-in Customer')}</div>
                        {inv.customerPhone && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <Phone size={10} style={{ color: '#94a3b8' }} />
                            <span>{inv.customerPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Items Count */}
                      <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {inv.items?.length || 1}
                      </td>

                      {/* Paid Amount */}
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }} className="font-mono">
                        Rs. {Number(inv.paidAmount || 0).toLocaleString()}
                      </td>

                      {/* Balance Due */}
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: isDue ? '#dc2626' : '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }} className="font-mono">
                        Rs. {Number(inv.balanceDue || 0).toLocaleString()}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                        {renderStatusBadge(inv.paymentStatus)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {/* Print Button */}
                          <button
                            type="button"
                            onClick={() => handlePrint(inv)}
                            title={language === 'ur' ? 'پرنٹ کریں (A4 / 80mm)' : 'Print invoice receipt'}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Printer size={12} />
                          </button>

                          {/* Collect Payment Button */}
                          {isDue && (
                            <button
                              type="button"
                              onClick={() => handleCollectPayment(inv)}
                              title={language === 'ur' ? 'ادھار وصول کریں' : 'Collect payment'}
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <DollarSign size={12} />
                            </button>
                          )}

                          {/* Void / Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv)}
                            title={language === 'ur' ? 'بل منسوخ کریں (اسٹاک واپس)' : 'Void invoice & restore inventory stock'}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: '1px solid #fecdd3',
                              background: '#fff1f2',
                              color: '#e11d48',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Global Pagination Component (Matches Screenshot) */}
        <GlobalPagination
          currentPage={activePage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          language={language}
        />
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 6. MODALS & POPUPS                                                        */}
      {/* ------------------------------------------------------------------------- */}
      {/* A4 Bill Book & 80mm Thermal Receipt Modal */}
      {isPrintModalOpen && selectedInvoice && (
        <BillPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          invoice={selectedInvoice}
          settings={settings}
        />
      )}

      {/* Payment Recovery Modal */}
      {isPaymentOpen && selectedCustomerForPayment && (
        <PaymentCollectionModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          customer={selectedCustomerForPayment}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

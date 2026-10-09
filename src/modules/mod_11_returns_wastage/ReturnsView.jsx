import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Layers,
  FileText,
  User,
  Truck,
  Hammer,
  Trash2,
  Filter,
  X,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  Printer,
  Eye,
  Edit2,
  Tag,
  ChevronDown,
  Check,
  Share2,
  Boxes,
  TrendingDown,
  PackageCheck,
  PackagePlus,
  Receipt,
  Phone,
  Building,
  DollarSign,
  Info,
  Save
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, adjustItemStock } from '../../db/index';
import { useLanguage } from '../../context/LanguageContext';
import GlobalPagination from '../../components/GlobalPagination';
import UniversalReportPrintModal from '../../components/UniversalReportPrintModal';
import {
  recordSalesReturn,
  recordPurchaseReturn,
  recordFactoryWastage,
  deleteReturnRecord,
  updateReturnRecord,
  getInvoiceDetailsForReturn,
  getRecentInvoicesForLinking
} from './returnsWastageService';

const rs = (n) => 'Rs. ' + Math.round(Number(n || 0)).toLocaleString();

export default function ReturnsView({ settings }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  // ─────────────────────────────────────────────────────────────────────────────
  // Live Database Queries
  // ─────────────────────────────────────────────────────────────────────────────
  const returnsData = useLiveQuery(async () => {
    const all = await db.returns.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];

  const wastageLogs = useLiveQuery(async () => {
    const all = await db.wastage_logs.toArray();
    return all.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, []) || [];

  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray(), []) || [];
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []) || [];
  const recentInvoices = useLiveQuery(() => db.invoices.orderBy('id').reverse().limit(40).toArray(), []) || [];
  const dbSettings = useLiveQuery(() => db.settings.toArray(), [])?.[0] || settings || {};

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation Tabs & Filters
  // ─────────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SALES_RETURNS' | 'FACTORY_WASTAGE' | 'PURCHASE_RETURNS'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CLEARED' | 'GOOD' | 'DAMAGED'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('Sales Return'); // 'Sales Return' | 'Factory Wastage' | 'Purchase Return'
  const [drawerReturn, setDrawerReturn] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [slipPrintFormat, setSlipPrintFormat] = useState('a4'); // 'a4' | 'thermal'
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [editOperator, setEditOperator] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Form Fields for New Return / Wastage
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [returnSqFt, setReturnSqFt] = useState('40');
  const [returnPieces, setReturnPieces] = useState('0');
  const [returnBoxes, setReturnBoxes] = useState('0');
  const [returnRate, setReturnRate] = useState('180');
  const [condition, setCondition] = useState('Good - Return to Yard Stock');
  const [refundMethod, setRefundMethod] = useState('Deduct from Khata Due Balance');
  const [reason, setReason] = useState('Leftover marble after flooring completion');
  const [wastageSource, setWastageSource] = useState('Bridge-Cutter Cutting Loss');
  const [operatorName, setOperatorName] = useState('Master Aslam (Cutter Master)');
  const [submitting, setSubmitting] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Top 4 KPI Metrics Calculations (Identical to Picture 1 & Picture 2 Standard)
  // ─────────────────────────────────────────────────────────────────────────────
  const salesReturnsList = useMemo(() => returnsData.filter((r) => r.type === 'Sales Return'), [returnsData]);
  const wastageReturnsList = useMemo(() => returnsData.filter((r) => r.type === 'Factory Wastage'), [returnsData]);
  const purchaseReturnsList = useMemo(() => returnsData.filter((r) => r.type === 'Purchase Return'), [returnsData]);

  // Card 1: Returns Value (Total value of customer returns processed) -> Rs. 7,200
  const totalSalesReturnValue = useMemo(() => {
    return salesReturnsList.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [salesReturnsList]);

  // Card 2: Breakage Loss (Factory breakage incidents logged) -> 25 Sq. Ft.
  const totalBreakageLossSqFt = useMemo(() => {
    if (wastageLogs.length > 0) {
      return wastageLogs.reduce((sum, w) => sum + (Number(w.sqFt) || 0), 0);
    }
    return wastageReturnsList.reduce((sum, r) => {
      const sq = (r.items || []).reduce((s, it) => s + (Number(it.sqft) || 0), 0);
      return sum + sq;
    }, 0);
  }, [wastageLogs, wastageReturnsList]);

  // Card 3: Financial Wastage (Financial loss deducted from yard stock) -> Rs. 7,250
  const totalFinancialWastageLoss = useMemo(() => {
    if (wastageLogs.length > 0) {
      return wastageLogs.reduce((sum, w) => sum + (Number(w.financialLoss) || 0), 0);
    }
    return wastageReturnsList.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [wastageLogs, wastageReturnsList]);

  // Card 4: Returns Area (Area of customer returns restocked) -> 40 Sq. Ft.
  const totalReturnsAreaRestocked = useMemo(() => {
    return salesReturnsList.reduce((sum, r) => {
      const sq = (r.items || [])
        .filter((it) => (it.condition || '').includes('Good'))
        .reduce((s, it) => s + (Number(it.sqft) || 0), 0);
      return sum + sq;
    }, 0);
  }, [salesReturnsList]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered List & Pagination
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredReturns = useMemo(() => {
    return returnsData.filter((r) => {
      // 1. Tab filter
      if (activeTab === 'SALES_RETURNS' && r.type !== 'Sales Return') return false;
      if (activeTab === 'FACTORY_WASTAGE' && r.type !== 'Factory Wastage') return false;
      if (activeTab === 'PURCHASE_RETURNS' && r.type !== 'Purchase Return') return false;

      // 2. Search filter
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchDoc = (r.returnNo || '').toLowerCase().includes(s);
        const matchParty = (r.partyName || '').toLowerCase().includes(s);
        const matchRef = (r.refDocNo || '').toLowerCase().includes(s);
        const matchReason = (r.reason || '').toLowerCase().includes(s);
        const matchOperator = (r.operatorName || '').toLowerCase().includes(s);
        const matchItem = (r.items || []).some(
          (it) => (it.name || '').toLowerCase().includes(s) || (it.category || '').toLowerCase().includes(s)
        );
        if (!matchDoc && !matchParty && !matchRef && !matchReason && !matchOperator && !matchItem) {
          return false;
        }
      }

      // 3. Status / Condition filter
      if (statusFilter === 'CLEARED' && r.status !== 'Completed' && r.status !== 'Cleared') return false;
      if (statusFilter === 'GOOD') {
        const hasGood = (r.items || []).some((it) => (it.condition || '').includes('Good'));
        if (!hasGood) return false;
      }
      if (statusFilter === 'DAMAGED') {
        const hasDamaged =
          r.type === 'Factory Wastage' ||
          (r.items || []).some((it) => (it.condition || '').toLowerCase().includes('damage') || (it.condition || '').toLowerCase().includes('scrap'));
        if (!hasDamaged) return false;
      }

      // 4. Date Range filter
      if (dateRange !== 'ALL') {
        const now = new Date();
        const rDate = new Date(r.date || r.createdAt || 0);
        if (dateRange === 'TODAY' && rDate.toDateString() !== now.toDateString()) return false;
        if (dateRange === 'WEEK') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (rDate < weekAgo) return false;
        }
        if (dateRange === 'MONTH') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          if (rDate < monthAgo) return false;
        }
        if (dateRange === 'CUSTOM') {
          const rDateStr = (r.date || r.createdAt || '').slice(0, 10);
          if (customStartDate && rDateStr < customStartDate) return false;
          if (customEndDate && rDateStr > customEndDate) return false;
        }
      }

      return true;
    });
  }, [returnsData, activeTab, searchTerm, statusFilter, dateRange, customStartDate, customEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedReturns = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredReturns.slice(start, start + pageSize);
  }, [filteredReturns, activePage, pageSize]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Modal Open Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenModal = (mode = 'Sales Return') => {
    setModalMode(mode);
    setSelectedInvoiceNo('');
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id.toString());
      setCustomerName(customers[0].name);
    }
    if (suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id.toString());
    }
    if (items.length > 0) {
      setSelectedItemId(items[0].id.toString());
      setReturnRate(items[0].costPerSqFt || items[0].ratePerSqFt ? (items[0].costPerSqFt || items[0].ratePerSqFt).toString() : '180');
    }
    setReturnSqFt('40');
    setReturnPieces('0');
    setReturnBoxes('0');
    setCondition('Good - Return to Yard Stock');
    setRefundMethod('Deduct from Khata Due Balance');
    setReason(mode === 'Factory Wastage' ? 'Bridge-Cutting edge chipping on 18mm slab trimming' : 'Leftover tiles after project completion');
    setWastageSource('Bridge-Cutter Cutting Loss');
    setOperatorName('Master Aslam (Cutter Master)');
    setIsModalOpen(true);
  };

  const handleInvoiceSelect = async (invNo) => {
    setSelectedInvoiceNo(invNo);
    if (!invNo) return;
    try {
      const details = await getInvoiceDetailsForReturn(invNo);
      if (details) {
        if (details.customerId) {
          setSelectedCustomerId(details.customerId.toString());
        }
        setCustomerName(details.customerName || '');
        if (details.items && details.items.length > 0) {
          const first = details.items[0];
          setSelectedItemId(first.itemId.toString());
          setReturnRate(first.rate.toString());
          setReturnSqFt(Math.min(first.sqft, 50).toString());
        }
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
    }
  };

  const handleItemSelect = (itemIdStr) => {
    setSelectedItemId(itemIdStr);
    const it = items.find((i) => i.id === parseInt(itemIdStr, 10));
    if (it) {
      setReturnRate((it.costPerSqFt || it.ratePerSqFt || 180).toString());
    }
  };

  const handleSaveReturn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const item = items.find((i) => i.id === parseInt(selectedItemId, 10));
      if (!item) throw new Error('Please select a stone item.');

      const sqft = parseFloat(returnSqFt);
      const rate = parseFloat(returnRate) || 0;
      if (isNaN(sqft) || sqft <= 0) throw new Error('Please enter a valid positive square feet value.');

      if (modalMode === 'Sales Return') {
        const cust = customers.find((c) => c.id === parseInt(selectedCustomerId, 10));
        await recordSalesReturn({
          refDocNo: selectedInvoiceNo || 'N/A',
          partyId: cust ? cust.id : null,
          partyName: cust ? cust.name : (customerName || 'Walk-in Customer'),
          items: [
            {
              itemId: item.id,
              name: item.name,
              category: item.category,
              sqft,
              rate,
              condition
            }
          ],
          refundMethod,
          reason
        });
      } else if (modalMode === 'Factory Wastage') {
        await recordFactoryWastage({
          itemId: item.id,
          sqFt: sqft,
          pieces: parseInt(returnPieces, 10) || 0,
          boxes: parseInt(returnBoxes, 10) || 0,
          source: wastageSource,
          reason,
          operatorName
        });
      } else if (modalMode === 'Purchase Return') {
        const sup = suppliers.find((s) => s.id === parseInt(selectedSupplierId, 10));
        if (!sup) throw new Error('Please select a supplier.');
        await recordPurchaseReturn({
          partyId: sup.id,
          refDocNo: selectedInvoiceNo || 'N/A',
          items: [
            {
              itemId: item.id,
              name: item.name,
              category: item.category,
              sqft,
              rate
            }
          ],
          reason
        });
      }

      // Celebrate success!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });

      setIsModalOpen(false);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, returnNo) => {
    if (
      !window.confirm(
        tr(
          `Are you sure you want to rollback ${returnNo}? This will restore physical inventory and customer/supplier ledger balances automatically.`,
          `کیا آپ واقعی ${returnNo} کو واپس ختم کرنا چاہتے ہیں؟ اس سے اسٹاک اور کھاتہ خودکار درست ہو جائے گا۔`
        )
      )
    ) {
      return;
    }
    try {
      await deleteReturnRecord(id);
    } catch (err) {
      alert('Error during rollback: ' + err.message);
    }
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditReason(rec.reason || '');
    setEditOperator(rec.operatorName || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await updateReturnRecord(editingRecord.id, {
        reason: editReason,
        operatorName: editOperator
      });
      setIsEditModalOpen(false);
      setEditingRecord(null);
    } catch (err) {
      alert('Error saving changes: ' + err.message);
    }
  };

  const handleOpenSlip = (rec) => {
    setDrawerReturn(rec);
    setIsPrintModalOpen(true);
  };

  const handleCopyWhatsAppSlip = (rec) => {
    if (!rec) return;
    const company = dbSettings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری';
    const phone = dbSettings?.phone || '0321-6606645 / 0300-6664187';
    const it = rec.items?.[0] || {};

    const lines = [
      `*${company}*`,
      `*${rec.type === 'Factory Wastage' ? 'فیکٹری کٹائی نقصان واؤچر' : 'واپسی مال واؤچر (Return Slip)'}*`,
      `---------------------------------`,
      `*Doc #:* ${rec.returnNo}`,
      `*Date:* ${new Date(rec.date || rec.createdAt).toLocaleDateString()}`,
      `*Type:* ${rec.type}`,
      `*Party/Source:* ${rec.partyName}`,
      rec.refDocNo && rec.refDocNo !== 'N/A' ? `*Ref Bill #:* ${rec.refDocNo}` : null,
      `---------------------------------`,
      `*Item:* ${it.name || 'Marble'} (${it.category || ''})`,
      `*Quantity:* ${it.sqft || 0} Sq. Ft.`,
      `*Rate:* Rs. ${Number(it.rate || 0).toLocaleString()}/SqFt`,
      `*Total Financial Amount:* Rs. ${Number(rec.totalAmount || 0).toLocaleString()}`,
      `*Condition:* ${it.condition || 'N/A'}`,
      `*Refund/Settlement:* ${rec.refundMethod || 'N/A'}`,
      `*Reason:* ${rec.reason || 'N/A'}`,
      rec.operatorName ? `*Operator/Master:* ${rec.operatorName}` : null,
      `---------------------------------`,
      `رابطہ: ${phone}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  return (
    <div
      className="returns-printable-area"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxWidth: '1440px',
        margin: '0 auto',
        paddingBottom: '30px'
      }}
    >
      {/* ── Dynamic Print Styles Fix ────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .returns-printable-area, .returns-printable-area * { visibility: visible !important; }
          .returns-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 15px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print { display: none !important; }
          h1, h2, h3, p, span, td, th, div {
            color: #000000 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          table { border: 1px solid #ccc !important; width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #ddd !important; padding: 6px 8px !important; }
        }
      `}</style>

      {/* Print-Only Header Banner */}
      <div style={{ display: 'none' }} className="print-target">
        <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#000' }}>
            {dbSettings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری'}
          </h2>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '3px' }}>
            Returns, Breakage & Wastage Audit Report (واپسی و نقصان رپورٹ)
          </div>
          <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '2px' }}>
            Printed on: {new Date().toLocaleString()} | Filter: {activeTab === 'ALL' ? 'All Records' : activeTab}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 1. SEAMLESS HERO HEADER (Matching Picture 1 & Picture 2 Standard)            */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div
        className="no-print"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 4px 10px 4px',
          minHeight: '84px',
          overflow: 'hidden'
        }}
      >
        {/* Left Title & Breadcrumb */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#2563eb',
              marginBottom: '4px',
              display: 'inline-block'
            }}
          >
            {tr('Returns & Waste', 'واپسی اور فیکٹری نقصان')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
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
              }}
            >
              <RotateCcw size={24} style={{ color: '#ffffff' }} />
            </div>

            <div>
              <h1
                style={{
                  fontSize: '1.7rem',
                  fontWeight: 800,
                  color: 'var(--text-primary, #0f172a)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                Returns & Waste{' '}
                <span
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary, #64748b)',
                    fontFamily: 'var(--font-urdu)'
                  }}
                >
                  (واپسی اور فیکٹری نقصان)
                </span>
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--text-secondary, #64748b)',
                  margin: '2px 0 0 0',
                  fontWeight: 500
                }}
              >
                {tr(
                  'Manage customer returns and factory wastage',
                  'واپسی مال اور کٹائی نقصان کا انتظام'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenModal('Sales Return')}
            style={{
              background: '#2563eb',
              borderColor: '#2563eb',
              fontWeight: 700,
              fontSize: '0.86rem',
              padding: '10px 18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              color: '#ffffff'
            }}
          >
            <Plus size={16} />
            <span>{tr('Add Return', 'واپسی مال درج کریں')}</span>
          </button>
        </div>

        {/* Seamless Marble Background Overlay */}
        <div
          style={{
            position: 'absolute',
            right: '0',
            top: '-15px',
            bottom: '-15px',
            width: '50%',
            maxWidth: '520px',
            backgroundImage: `url('./stock_background.jpg'), url('/stock_background.jpg'), url('./supplier_background.jpg'), url('/supplier_background.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'right center',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
            opacity: 0.95,
            borderRadius: '14px'
          }}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 2. TOP 4 KPI CARDS (Matching Picture 1 & Picture 2 Standard)                 */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="kpi-card-grid">
        {/* Card 1: Returns Value (Blue Icon) */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <RotateCcw size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Returns Value</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>
                (کل واپسی مالیت)
              </span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {rs(totalSalesReturnValue)}
            </div>
          </div>
        </div>

        {/* Card 2: Breakage Loss (Green Icon) */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green" style={{ background: '#10b981' }}>
            <Layers size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Breakage Loss</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>
                (کٹائی نقصان رقبہ)
              </span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalBreakageLossSqFt.toLocaleString()}{' '}
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>Sq. Ft.</span>
            </div>
          </div>
        </div>

        {/* Card 3: Financial Wastage (Red Icon) */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon red" style={{ background: '#ef4444' }}>
            <TrendingDown size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Financial Wastage</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>
                (مالیاتی نقصان)
              </span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>
              {rs(totalFinancialWastageLoss)}
            </div>
          </div>
        </div>

        {/* Card 4: Returns Area (Amber/Orange Icon) */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon amber" style={{ background: '#f59e0b' }}>
            <PackageCheck size={22} />
          </div>
          <div className="kpi-metric-body" style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">Returns Area</span>
              <span className="kpi-metric-label-ur" style={{ fontFamily: 'var(--font-urdu)' }}>
                (واپس شدہ رقبہ)
              </span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalReturnsAreaRestocked.toLocaleString()}{' '}
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>Sq. Ft.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 3. TABS & FILTER CONTROL PANEL (Picture 2 Consistent Standard)               */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          padding: '16px 18px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Top: 4 Segment Tabs Switcher + Print Report */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('ALL'); setCurrentPage(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'ALL' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'ALL' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'ALL' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={15} />
            <span>All Records ({returnsData.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('SALES_RETURNS'); setCurrentPage(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'SALES_RETURNS' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'SALES_RETURNS' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'SALES_RETURNS' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCcw size={15} />
            <span>Customer Returns ({salesReturnsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('FACTORY_WASTAGE'); setCurrentPage(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'FACTORY_WASTAGE' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'FACTORY_WASTAGE' ? '#ffffff' : 'var(--text-secondary, #475569)',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: activeTab === 'FACTORY_WASTAGE' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Hammer size={15} />
            <span>Factory Wastage ({wastageReturnsList.length})</span>
          </button>

          {purchaseReturnsList.length > 0 && (
            <button
              type="button"
              onClick={() => { setActiveTab('PURCHASE_RETURNS'); setCurrentPage(1); }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'PURCHASE_RETURNS' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'PURCHASE_RETURNS' ? '#ffffff' : 'var(--text-secondary, #475569)',
                fontWeight: 700,
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: activeTab === 'PURCHASE_RETURNS' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Truck size={15} />
              <span>Supplier Returns ({purchaseReturnsList.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-primary, #f8fafc)',
              color: 'var(--text-secondary, #475569)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>

        {/* Bottom: Filter Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                activeTab === 'FACTORY_WASTAGE'
                  ? 'Search log #, stone item, machine, operator...'
                  : activeTab === 'SALES_RETURNS'
                    ? 'Search return #, customer, item, reason...'
                    : 'Search return #, customer, item...'
              }
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.84rem',
                outline: 'none',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                height: '44px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Date Range Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0 14px 0 34px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Date Range: All</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
            <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card, #ffffff)',
                  outline: 'none',
                  height: '44px'
                }}
                title="From Date"
              />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card, #ffffff)',
                  outline: 'none',
                  height: '44px'
                }}
                title="To Date"
              />
            </div>
          )}

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0 14px 0 34px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.84rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Status: All</option>
              <option value="CLEARED">Cleared / Completed</option>
              <option value="GOOD">Good Restocked</option>
              <option value="DAMAGED">Damaged / Scrap</option>
            </select>
            <Tag size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          </div>

          {/* Reset Filters */}
          {(searchTerm || statusFilter !== 'ALL' || dateRange !== 'ALL' || customStartDate || customEndDate) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setDateRange('ALL');
                setCustomStartDate('');
                setCustomEndDate('');
                setCurrentPage(1);
              }}
              style={{
                height: '44px',
                padding: '0 10px',
                color: '#ef4444',
                fontSize: '0.78rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 4. MAIN AUDIT DATA TABLE (Exact Columns matching Picture 1)                  */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                <th style={{ width: '100px', padding: '12px 14px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>DOC #</th>
                <th style={{ width: '90px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>DATE</th>
                <th style={{ padding: '12px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>PARTY / SOURCE</th>
                <th style={{ padding: '12px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>STONE ITEM</th>
                <th style={{ width: '120px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'right' }}>FINANCIAL AMOUNT</th>
                <th style={{ width: '150px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>CONDITION / METHOD</th>
                <th style={{ width: '95px', padding: '12px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '45px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No return or wastage records found.</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Click "+ Add Return" or "Log Wastage" to record transactions into the system.</div>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((ret) => {
                  const item = ret.items?.[0] || {};
                  const isWastage = ret.type === 'Factory Wastage';
                  const isGood = (item.condition || '').includes('Good');

                  return (
                    <tr
                      key={ret.id}
                      style={{
                        borderBottom: '1px solid var(--border-divider, #f1f5f9)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* DOC # */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                          {ret.returnNo}
                        </span>
                      </td>

                      {/* DATE */}
                      <td style={{ padding: '11px 10px', fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {(ret.date || ret.createdAt || '').slice(0, 10)}
                      </td>

                      {/* PARTY / SOURCE */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontSize: '0.83rem' }}>
                          {ret.partyName}
                        </div>
                        {ret.refDocNo && ret.refDocNo !== 'N/A' && !ret.refDocNo.toLowerCase().includes('n/a') && !ret.refDocNo.toLowerCase().includes('internal') && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                            Ref: {ret.refDocNo}
                          </div>
                        )}
                        {ret.operatorName && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                            {ret.operatorName.replace(/^Master:\s*/i, '')}
                          </div>
                        )}
                      </td>

                      {/* STONE ITEM */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)', fontSize: '0.83rem' }}>
                          {item.name || 'Marble Item'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.category || 'Standard'}
                        </div>
                      </td>

                      {/* FINANCIAL AMOUNT */}
                      <td
                        style={{
                          padding: '11px 10px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          color: isWastage ? '#dc2626' : '#2563eb',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Rs. {Number(ret.totalAmount || 0).toLocaleString()}
                      </td>

                      {/* CONDITION / METHOD */}
                      <td style={{ padding: '11px 10px' }}>
                        {item.condition && (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: isGood ? '#f0fdf4' : '#fef2f2',
                              color: isGood ? '#16a34a' : '#ef4444',
                              border: `1px solid ${isGood ? '#bbf7d0' : '#fecaca'}`
                            }}
                          >
                            {item.condition.split(' - ')[0]}
                          </span>
                        )}
                        {ret.refundMethod && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            {ret.refundMethod === 'Deduct from Khata Due Balance' ? 'Deduct Khata' : ret.refundMethod}
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td style={{ padding: '11px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {/* Print / View Slip */}
                          <button
                            type="button"
                            onClick={() => handleOpenSlip(ret)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Print / View Slip"
                          >
                            <FileText size={13} />
                          </button>

                          {/* Edit Remarks */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ret)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#f8fafc',
                              color: '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Edit Reason / Operator"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete / Rollback */}
                          <button
                            type="button"
                            onClick={() => handleDelete(ret.id, ret.returnNo)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#fef2f2',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Rollback & Restore Stock"
                          >
                            <Trash2 size={13} />
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

        {/* Global Pagination */}
        <GlobalPagination
          currentPage={activePage}
          totalPages={totalPages}
          totalRecords={filteredReturns.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          language={language}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: ADD RETURN / FACTORY WASTAGE / SUPPLIER RETURN                      */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="app-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="app-modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="app-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  className="app-modal-icon-badge"
                  style={{
                    background: modalMode === 'Factory Wastage' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: modalMode === 'Factory Wastage' ? '0 4px 12px rgba(239, 68, 68, 0.25)' : '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <RotateCcw size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 className="app-modal-title">
                    {modalMode === 'Factory Wastage'
                      ? tr('Log Factory Cutting Wastage', 'فیکٹری کٹائی نقصان درج کریں')
                      : modalMode === 'Sales Return'
                        ? tr('Record Customer Sales Return', 'گاہک واپسی مال ریکارڈ کریں')
                        : tr('Record Supplier Purchase Return', 'سپلائر واپسی مال')}
                  </h3>
                  <p className="app-modal-subtitle">
                    {tr('Dexie.js atomic multi-table transaction with automatic stock reconciliation', 'خودکار اسٹاک، یارڈ اور کھاتہ ایڈجسٹمنٹ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Mode Selector Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '14px 20px 0 20px',
                background: '#ffffff'
              }}
            >
              {[
                { id: 'Sales Return', labelEn: 'Customer Return', labelUr: 'گاہک واپسی' },
                { id: 'Factory Wastage', labelEn: 'Factory Wastage', labelUr: 'فیکٹری نقصان' },
                { id: 'Purchase Return', labelEn: 'Supplier Return', labelUr: 'سپلائر واپسی' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModalMode(m.id)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: modalMode === m.id ? (m.id === 'Factory Wastage' ? '#ef4444' : '#2563eb') : '#e2e8f0',
                    cursor: 'pointer',
                    background: modalMode === m.id ? (m.id === 'Factory Wastage' ? '#ef4444' : '#2563eb') : '#f8fafc',
                    color: modalMode === m.id ? '#ffffff' : '#64748b',
                    boxShadow: modalMode === m.id ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {m.labelEn} <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>({m.labelUr})</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveReturn} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="app-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Option to Link Existing Invoice for Customer Return */}
                {modalMode === 'Sales Return' && (
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {tr('Link Existing Bill / Invoice (بل سے منسلک کریں)', 'بل نمبر منتخب کریں (اختیاری)')}
                    </label>
                    <div className="app-input-wrapper">
                      <Receipt size={16} className="app-input-icon" />
                      <select
                        value={selectedInvoiceNo}
                        onChange={(e) => handleInvoiceSelect(e.target.value)}
                        className="app-form-select"
                        style={{ fontWeight: 600 }}
                      >
                        <option value="">-- {tr('Manual / Walk-in Return without Bill', 'بغیر بل کے براہِ راست واپسی')} --</option>
                        {recentInvoices.map((inv) => (
                          <option key={inv.id} value={inv.invoiceNo}>
                            {inv.invoiceNo} - {inv.customerName} ({rs(inv.grandTotal)})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                )}

                {/* Customer Selection */}
                {modalMode === 'Sales Return' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '12px' }}>
                    <div className="app-form-group">
                      <label className="app-form-label">
                        {tr('Customer Khata', 'گاہک کھاتہ')}
                      </label>
                      <div className="app-input-wrapper">
                        <User size={16} className="app-input-icon" />
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => {
                            setSelectedCustomerId(e.target.value);
                            const c = customers.find((x) => x.id === parseInt(e.target.value, 10));
                            if (c) setCustomerName(c.name);
                          }}
                          className="app-form-select"
                        >
                          <option value="">-- {tr('Walk-in Customer', 'عام گاہک')} --</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} (Due: {rs(c.balanceDue)})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="app-input-chevron" />
                      </div>
                    </div>

                    <div className="app-form-group">
                      <label className="app-form-label">
                        {tr('Customer Name', 'گاہک کا نام')}
                      </label>
                      <div className="app-input-wrapper">
                        <User size={16} className="app-input-icon" />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Tariq Mehmood"
                          className="app-form-input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Supplier Selection for Purchase Return */}
                {modalMode === 'Purchase Return' && (
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {tr('Select Supplier', 'سپلائر منتخب کریں')} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <Building size={16} className="app-input-icon" />
                      <select
                        value={selectedSupplierId}
                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                        className="app-form-select"
                      >
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.company || s.name} (Payable: {rs(s.balancePayable)})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="app-input-chevron" />
                    </div>
                  </div>
                )}

                {/* Machine / Source Selection for Factory Wastage */}
                {modalMode === 'Factory Wastage' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    <div className="app-form-group">
                      <label className="app-form-label">
                        {tr('Wastage Machine / Source', 'کٹائی نقصان کا ذریعہ')}
                      </label>
                      <div className="app-input-wrapper">
                        <Hammer size={16} className="app-input-icon" />
                        <select
                          value={wastageSource}
                          onChange={(e) => setWastageSource(e.target.value)}
                          className="app-form-select"
                        >
                          <option value="Bridge-Cutter Cutting Loss">Bridge-Cutter Cutting Loss (برج کٹر کٹائی)</option>
                          <option value="Gangsaw Slab Sawing Crack">Gangsaw Slab Sawing Crack (گینگ سا ٹوٹ پھوٹ)</option>
                          <option value="Polish & Edge Trimming Chipping">Polish & Edge Chipping (پالش و کنارہ نقصان)</option>
                          <option value="Yard Loading & Transit Breakage">Yard Loading & Transit (لوڈنگ ان لوڈنگ)</option>
                        </select>
                        <ChevronDown size={14} className="app-input-chevron" />
                      </div>
                    </div>
                    <div className="app-form-group">
                      <label className="app-form-label">
                        {tr('Cutter Master / Operator', 'کٹائی ماسٹر یا ملازم')}
                      </label>
                      <div className="app-input-wrapper">
                        <User size={16} className="app-input-icon" />
                        <input
                          type="text"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          placeholder="e.g. Master Aslam"
                          className="app-form-input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Stone Item Selection */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {tr('Marble / Stone Item', 'ماربل یا پتھر کا انتخاب')} <span className="app-form-label-required">*</span>
                  </label>
                  <div className="app-input-wrapper">
                    <Layers size={16} className="app-input-icon" />
                    <select
                      value={selectedItemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                      className="app-form-select"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} - {it.category} ({it.stockSqFt || 0} SqFt in Yard)
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="app-input-chevron" />
                  </div>
                </div>

                {/* Quantity (Sq. Ft.) and Rate */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="app-form-group">
                    <label className="app-form-label">
                      {tr('Quantity (Sq. Ft.)', 'مقدار (مربع فٹ)')} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <input
                        type="number"
                        step="0.1"
                        value={returnSqFt}
                        onChange={(e) => setReturnSqFt(e.target.value)}
                        required
                        className="app-form-input font-mono"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div className="app-form-group">
                    <label className="app-form-label">
                      {modalMode === 'Factory Wastage'
                        ? tr('Unit Cost (Rs/SqFt)', 'لاگت فی فٹ')
                        : tr('Return Rate (Rs/SqFt)', 'ریٹ فی مربع فٹ')} <span className="app-form-label-required">*</span>
                    </label>
                    <div className="app-input-wrapper">
                      <DollarSign size={16} className="app-input-icon" />
                      <input
                        type="number"
                        value={returnRate}
                        onChange={(e) => setReturnRate(e.target.value)}
                        required
                        className="app-form-input font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Calculation Preview */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {modalMode === 'Factory Wastage'
                      ? tr('Estimated Financial Loss:', 'کٹائی نقصان کی مالیاتی رقم:')
                      : tr('Total Return Credit Value:', 'کل واپسی مالیت:')}
                  </span>
                  <span
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: modalMode === 'Factory Wastage' ? '#ef4444' : '#2563eb',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {rs((parseFloat(returnSqFt) || 0) * (parseFloat(returnRate) || 0))}
                  </span>
                </div>

                {/* Condition & Settlement for Sales Return */}
                {modalMode === 'Sales Return' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="app-form-group">
                      <label className="app-form-label">
                        {tr('Stone Condition', 'مال کی حالت')}
                      </label>
                      <div className="app-input-wrapper">
                        <select
                          value={condition}
                          onChange={(e) => setCondition(e.target.value)}
                          className="app-form-select"
                        >
                          <option value="Good - Return to Yard Stock">Good - Restock to Yard (ٹھیک مال)</option>
                          <option value="Damaged - Scrap">Damaged - Scrap (خراب / سکریپ)</option>
                        </select>
                        <ChevronDown size={14} className="app-input-chevron" />
                      </div>
                    </div>
                    <div className="app-form-group">
                      <label className="app-form-label">
                        {tr('Refund Method', 'رقم کا طریقہ کار')}
                      </label>
                      <div className="app-input-wrapper">
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value)}
                          className="app-form-select"
                        >
                          <option value="Deduct from Khata Due Balance">Deduct from Khata Balance (ادھار سے کٹوتی)</option>
                          <option value="Cash Refund">Cash Refund from Drawer (نقد ادائیگی)</option>
                        </select>
                        <ChevronDown size={14} className="app-input-chevron" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason / Remarks Notes */}
                <div className="app-form-group">
                  <label className="app-form-label">
                    {tr('Reason & Remarks', 'وجہ و تفصیل')}
                  </label>
                  <div className="app-input-wrapper">
                    <FileText size={16} className="app-input-icon" />
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Leftover tiles, edge cracked during cutting, etc."
                      className="app-form-input"
                    />
                  </div>
                </div>

                {/* Notice banner */}
                <div className="app-form-notice">
                  <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span>All fields marked with <b style={{ color: '#ef4444' }}>*</b> are required.</span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="app-modal-footer">
                <button
                  type="button"
                  className="app-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={16} />
                  {tr('Cancel', 'منسوخ')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="app-btn-submit"
                  style={{
                    background: modalMode === 'Factory Wastage' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: modalMode === 'Factory Wastage' ? '0 4px 12px rgba(239, 68, 68, 0.25)' : '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Save size={16} />
                  {submitting ? tr('Saving...', 'محفوظ ہو رہا ہے...') : tr('Save & Reconcile', 'محفوظ کریں')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: PRINTABLE SLIP / VOUCHER                                           */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {isPrintModalOpen && drawerReturn && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: '16px'
          }}
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: slipPrintFormat === 'thermal' ? '440px' : '650px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSlipPrintFormat('a4')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: slipPrintFormat === 'a4' ? '#2563eb' : '#cbd5e1',
                    background: slipPrintFormat === 'a4' ? '#eff6ff' : '#ffffff',
                    color: slipPrintFormat === 'a4' ? '#2563eb' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  A4 Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setSlipPrintFormat('thermal')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: slipPrintFormat === 'thermal' ? '#2563eb' : '#cbd5e1',
                    background: slipPrintFormat === 'thermal' ? '#eff6ff' : '#ffffff',
                    color: slipPrintFormat === 'thermal' ? '#2563eb' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Thermal (80mm)
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppSlip(drawerReturn)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #86efac',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedWhatsApp ? <Check size={14} /> : <Share2 size={14} />}
                  <span>{copiedWhatsApp ? 'Copied!' : 'WhatsApp'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Slip Content */}
            <div
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '18px',
                background: '#ffffff',
                color: '#0f172a'
              }}
            >
              {/* Slip Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.02em' }}>
                      {dbSettings?.companyNameEnglish || 'Rana Abdullah Siddique Marble Factory'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }} dir="rtl">
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                      {dbSettings?.companyNameUrdu || dbSettings?.companyName || 'رانا عبداللہ صدیق ماربل فیکٹری'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                  {dbSettings?.address || 'جھمرہ سٹی، بالمقابل ریلوے پھاٹک، فیصل آباد روڈ'} | فون: {dbSettings?.phone || '0321-6606645 / 0300-6664187'}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '3px 12px',
                    borderRadius: '4px',
                    background: drawerReturn.type === 'Factory Wastage' ? '#fee2e2' : '#eff6ff',
                    color: drawerReturn.type === 'Factory Wastage' ? '#dc2626' : '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                >
                  {drawerReturn.type === 'Factory Wastage' ? 'Factory Breakage & Wastage Log' : 'Official Stock Return Slip'}
                </div>
              </div>

              {/* Slip Meta Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>
                <div>
                  <strong>Document #:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{drawerReturn.returnNo}</span>
                </div>
                <div>
                  <strong>Date:</strong> {new Date(drawerReturn.date || drawerReturn.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <strong>Party / Machine:</strong> {drawerReturn.partyName}
                </div>
                {drawerReturn.refDocNo && drawerReturn.refDocNo !== 'N/A' && (
                  <div>
                    <strong>Ref Invoice:</strong> {drawerReturn.refDocNo}
                  </div>
                )}
                {drawerReturn.operatorName && (
                  <div>
                    <strong>Operator:</strong> {drawerReturn.operatorName}
                  </div>
                )}
                <div>
                  <strong>Status:</strong> {drawerReturn.status || 'Cleared'}
                </div>
              </div>

              {/* Items Breakdown Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Description</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Sq. Ft.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate (Rs)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawerReturn.items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{it.condition || it.category}</div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{it.sqft}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{it.rate}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {Number(it.amount || it.sqft * it.rate).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Summary */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '14px'
                }}
              >
                <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Total Value / Financial Loss:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: drawerReturn.type === 'Factory Wastage' ? '#dc2626' : '#2563eb' }}>
                  Rs. {Number(drawerReturn.totalAmount || 0).toLocaleString()}
                </span>
              </div>

              {/* Reason & Settlement */}
              <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '18px' }}>
                <div><strong>Reason:</strong> {drawerReturn.reason || 'N/A'}</div>
                {drawerReturn.refundMethod && (
                  <div><strong>Settlement:</strong> {drawerReturn.refundMethod}</div>
                )}
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b' }}>
                <div>Authorized Signatory</div>
                <div>Receiver Signature</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 7. MODAL: EDIT RETURN / WASTAGE RECORD                                       */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {isEditModalOpen && editingRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: '16px'
          }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Edit Record ({editingRecord.returnNo})
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Reason & Flaw Details
                </label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.84rem',
                    background: 'var(--bg-primary, #f8fafc)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '8px',
                    color: 'var(--text-primary, #0f172a)',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {editingRecord.type === 'Factory Wastage' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Operator / Staff Name
                  </label>
                  <input
                    type="text"
                    value={editOperator}
                    onChange={(e) => setEditOperator(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      fontSize: '0.84rem',
                      background: 'var(--bg-primary, #f8fafc)',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      color: 'var(--text-primary, #0f172a)',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 8. MODAL: PRINTABLE SUMMARY AUDIT REPORT                                     */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* Universal Report Print Modal for Returns & Wastage */}
      <UniversalReportPrintModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Factory Wastage & Customer Returns Audit Report"
        titleUrdu="فیکٹری ویسٹیج و کسٹمر واپسی آڈٹ رپورٹ"
        subtitle={`Filter: ${activeTab} | Date: ${dateRange} | Total Records: ${filteredReturns.length}`}
        factorySettings={dbSettings || settings}
        kpis={[
          { label: 'Returns Value', labelUrdu: 'واپسی مالیت', value: rs(totalSalesReturnValue), color: '#2563eb' },
          { label: 'Breakage Loss', labelUrdu: 'ٹوٹ پھوٹ رقبہ', value: `${totalBreakageLossSqFt} SqFt`, color: '#059669' },
          { label: 'Financial Loss', labelUrdu: 'مالی نقصان', value: rs(totalFinancialWastageLoss), color: '#dc2626' },
          { label: 'Restocked Area', labelUrdu: 'بحال شدہ اسٹاک', value: `${totalReturnsAreaRestocked} SqFt`, color: '#d97706' }
        ]}
        columns={[
          { key: 'returnNo', label: 'Doc / Log #', labelUrdu: 'نمبر', bold: true },
          { key: 'date', label: 'Date', labelUrdu: 'تاریخ', render: (r) => (r.date || r.createdAt || '').slice(0, 10) },
          { key: 'type', label: 'Type', labelUrdu: 'قسم' },
          { key: 'partyName', label: 'Party / Source', labelUrdu: 'پارٹی / مشین' },
          { key: 'itemName', label: 'Stone Item', labelUrdu: 'آئٹم', render: (r) => r.items?.[0]?.name || 'Marble' },
          { key: 'sqft', label: 'Sq.Ft / Qty', labelUrdu: 'رقبہ / تعداد', align: 'right', render: (r) => `${r.items?.[0]?.sqft || 0} sqft` },
          { key: 'totalAmount', label: 'Amount (Rs.)', labelUrdu: 'رقم', align: 'right', bold: true, render: (r) => rs(r.totalAmount || 0) },
          { key: 'status', label: 'Status', labelUrdu: 'حیثیت', align: 'center', render: (r) => r.status || 'Cleared' }
        ]}
        data={filteredReturns}
        summaryRows={[
          { label: 'Total Returns Value', labelUrdu: 'کل کسٹمر واپسی مالیت', value: rs(totalSalesReturnValue) },
          { label: 'Net Financial Loss', labelUrdu: 'کل خالص مالی نقصان', value: rs(totalFinancialWastageLoss) }
        ]}
      />

    </div>
  );
}

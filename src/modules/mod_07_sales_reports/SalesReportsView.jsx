import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Filter,
  Users,
  Layers,
  Award,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
  PieChart,
  ArrowRight,
  Boxes,
  HelpCircle,
  X,
  Receipt,
  FileText
} from 'lucide-react';
import { db } from '../../db/index';
import { useLanguage } from '../../context/LanguageContext';
import UniversalReportPrintModal from '../../components/UniversalReportPrintModal';
import {
  getComprehensiveSalesReport,
  exportSalesReportToCSV,
  exportSalesReportToJSON,
  getHorizonDateRange
} from './salesReportsService';

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const HORIZONS = [
  { key: 'Daily', labelEn: 'Daily', labelUr: 'آج' },
  { key: 'Weekly', labelEn: 'Weekly', labelUr: 'اس ہفتے' },
  { key: 'Monthly', labelEn: 'Monthly', labelUr: 'اس ماہ' },
  { key: 'Yearly', labelEn: 'Yearly', labelUr: 'اس سال' },
  { key: 'Custom', labelEn: 'Custom', labelUr: 'مخصوص تاریخ' }
];

/**
 * Pure helper function to get print configuration dynamically based on activeTab.
 * Defined outside component to strictly follow React Rules of Hooks.
 */
function getPrintConfig({
  activeTab,
  categoryBreakdown = [],
  sutarBreakdown = [],
  topCustomers = [],
  topProducts = [],
  expensesList = [],
  invoicesList = [],
  summary = {}
}) {
  switch (activeTab) {
    case 'OVERVIEW':
      return {
        title: 'Category Performance & Sales Report',
        titleUrdu: 'اقسام ماربل و ٹائلز سیلز رپورٹ',
        columns: [
          { key: 'name', label: 'Category', labelUrdu: 'ماربل قسم', bold: true, render: (r) => r.name || '-' },
          {
            key: 'sqFt',
            label: 'Unit Sold',
            labelUrdu: 'یونٹس فروخت',
            align: 'right',
            render: (r) => `${Number(r.sqFt || r.quantity || 0).toLocaleString()} ${r.unit || (r.category === 'Tiles' || r.name === 'Tiles' ? 'Meters' : (['Flowers', 'Panels', 'Tile Accessories', 'Other Accessories', 'Tukri', 'Kalm'].includes(r.category || r.name) ? 'Pieces' : (['Borders', 'Kali Patti'].includes(r.category || r.name) ? 'R.Ft' : 'Sq.Ft')))}`
          },
          {
            key: 'avgRate',
            label: 'Avg Rate',
            labelUrdu: 'اوسط ریٹ',
            align: 'right',
            render: (r) => rs(r.avgRatePerSqFt || 0)
          },
          {
            key: 'cogs',
            label: 'COGS Cost',
            labelUrdu: 'خام لاگت',
            align: 'right',
            render: (r) => rs(r.cogs || 0)
          },
          {
            key: 'revenue',
            label: 'Revenue',
            labelUrdu: 'آمدن',
            align: 'right',
            bold: true,
            render: (r) => rs(r.revenue || 0)
          },
          {
            key: 'profit',
            label: 'Gross Profit',
            labelUrdu: 'خام منافع',
            align: 'right',
            bold: true,
            render: (r) => rs(r.profit || 0)
          },
          {
            key: 'margin',
            label: 'Margin %',
            labelUrdu: 'مارجن',
            align: 'center',
            render: (r) => `${r.marginPct || 0}%`
          },
          {
            key: 'share',
            label: 'Share %',
            labelUrdu: 'سیلز حصہ',
            align: 'center',
            render: (r) => `${r.sharePct || 0}%`
          }
        ],
        data: categoryBreakdown || [],
        summaryRows: [
          { label: 'Total Categories Sold', labelUrdu: 'کل اقسام تعداد', value: `${categoryBreakdown.length}` },
          { label: 'Total Stone Cost (COGS)', labelUrdu: 'کل خام لاگت', value: rs(summary?.totalCOGS) },
          { label: 'Total Gross Profit', labelUrdu: 'کل خام منافع', value: rs(summary?.grossProfit) }
        ]
      };

    case 'SUTARS':
      return {
        title: 'Sutar Thickness Breakdown Audit Report',
        titleUrdu: 'ماربل سوتر موٹائی تجزیہ رپورٹ',
        columns: [
          { key: 'name', label: 'Thickness Category', labelUrdu: 'سوتر موٹائی', bold: true, render: (r) => r.name || '-' },
          {
            key: 'sqFt',
            label: 'Unit Sold',
            labelUrdu: 'یونٹس فروخت',
            align: 'right',
            render: (r) => `${Number(r.sqFt || r.quantity || 0).toLocaleString()} ${r.unit || (r.category === 'Tiles' || r.name === 'Tiles' ? 'Meters' : (['Flowers', 'Panels', 'Tile Accessories', 'Other Accessories', 'Tukri', 'Kalm'].includes(r.category || r.name) ? 'Pieces' : (['Borders', 'Kali Patti'].includes(r.category || r.name) ? 'R.Ft' : 'Sq.Ft')))}`
          },
          {
            key: 'cogs',
            label: 'Stone Cost (COGS)',
            labelUrdu: 'خام لاگت',
            align: 'right',
            render: (r) => rs(r.cogs || 0)
          },
          {
            key: 'revenue',
            label: 'Revenue',
            labelUrdu: 'سیلز آمدن',
            align: 'right',
            bold: true,
            render: (r) => rs(r.revenue || 0)
          },
          {
            key: 'profit',
            label: 'Gross Profit',
            labelUrdu: 'منافع',
            align: 'right',
            bold: true,
            render: (r) => rs(r.profit || 0)
          },
          {
            key: 'margin',
            label: 'Margin %',
            labelUrdu: 'مارجن',
            align: 'center',
            render: (r) => `${r.marginPct || 0}%`
          },
          {
            key: 'share',
            label: 'Sales Share %',
            labelUrdu: 'سیلز حصہ',
            align: 'center',
            render: (r) => `${r.sharePct || 0}%`
          }
        ],
        data: sutarBreakdown || [],
        summaryRows: [
          { label: 'Total Marble Sq. Ft.', labelUrdu: 'کل رقبہ فروخت', value: `${(summary?.totalSqFtSold || 0).toLocaleString()} Sq.Ft` },
          { label: 'Total Revenue', labelUrdu: 'کل سیلز رقم', value: rs(summary?.grossSales) }
        ]
      };

    case 'CUSTOMERS':
      return {
        title: 'Top Customers Khata & Revenue Audit Report',
        titleUrdu: 'نمبر ون گاہک کھاتہ دار آڈٹ رپورٹ',
        columns: [
          { key: 'name', label: 'Customer / Khata Name', labelUrdu: 'گاہک کا نام', bold: true, render: (r) => r.name || '-' },
          { key: 'phone', label: 'Phone', labelUrdu: 'فون نمبر', render: (r) => r.phone || '-' },
          { key: 'city', label: 'City', labelUrdu: 'شہر', render: (r) => r.city || '-' },
          { key: 'billsCount', label: 'Invoices', labelUrdu: 'بلز تعداد', align: 'center', render: (r) => `${r.billsCount || 0}` },
          {
            key: 'sqFt',
            label: 'Total Units Sold',
            labelUrdu: 'کل فروخت یونٹس',
            align: 'right',
            render: (r) => `${Number(r.sqFt || r.quantity || 0).toLocaleString()} ${r.unit || (r.category === 'Tiles' || r.name === 'Tiles' ? 'Meters' : (['Flowers', 'Panels', 'Tile Accessories', 'Other Accessories', 'Tukri', 'Kalm'].includes(r.category || r.name) ? 'Pieces' : (['Borders', 'Kali Patti'].includes(r.category || r.name) ? 'R.Ft' : 'Sq.Ft')))}`
          },
          {
            key: 'revenue',
            label: 'Total Billed',
            labelUrdu: 'کل بلنگ',
            align: 'right',
            bold: true,
            render: (r) => rs(r.revenue || 0)
          },
          {
            key: 'balanceDue',
            label: 'Balance Due',
            labelUrdu: 'بقایا ادھار',
            align: 'right',
            bold: true,
            render: (r) => rs(r.balanceDue || 0)
          }
        ],
        data: topCustomers || [],
        summaryRows: [
          { label: 'Ranked Customers', labelUrdu: 'گاہکوں کی تعداد', value: `${topCustomers.length}` },
          { label: 'Total Billed to Top Customers', labelUrdu: 'کل بلنگ رقم', value: rs(topCustomers.reduce((s, c) => s + (c.revenue || 0), 0)) },
          { label: 'Total Outstanding Receivables', labelUrdu: 'کل واجب الوصول بقایا', value: rs(topCustomers.reduce((s, c) => s + (c.balanceDue || 0), 0)) }
        ]
      };

    case 'PRODUCTS':
      return {
        title: 'Top Stone Items Performance Audit Report',
        titleUrdu: 'نمبر ون پتھر و مصنوعات سیلز رپورٹ',
        columns: [
          { key: 'code', label: 'Code', labelUrdu: 'کوڈ', render: (r) => r.code || '-' },
          { key: 'name', label: 'Stone Name', labelUrdu: 'پتھر کا نام', bold: true, render: (r) => r.name || '-' },
          { key: 'category', label: 'Category', labelUrdu: 'کیٹیگری', render: (r) => r.category || '-' },
          {
            key: 'sqFt',
            label: 'Unit Sold',
            labelUrdu: 'یونٹس فروخت',
            align: 'right',
            render: (r) => `${Number(r.sqFt || r.quantity || 0).toLocaleString()} ${r.unit || (r.category === 'Tiles' || r.name === 'Tiles' ? 'Meters' : (['Flowers', 'Panels', 'Tile Accessories', 'Other Accessories', 'Tukri', 'Kalm'].includes(r.category || r.name) ? 'Pieces' : (['Borders', 'Kali Patti'].includes(r.category || r.name) ? 'R.Ft' : 'Sq.Ft')))}`
          },
          {
            key: 'revenue',
            label: 'Revenue',
            labelUrdu: 'سیلز رقم',
            align: 'right',
            bold: true,
            render: (r) => rs(r.revenue || 0)
          },
          {
            key: 'cogs',
            label: 'Est. Cost',
            labelUrdu: 'خام لاگت',
            align: 'right',
            render: (r) => rs(r.cogs || 0)
          },
          {
            key: 'profit',
            label: 'Gross Profit',
            labelUrdu: 'خام منافع',
            align: 'right',
            bold: true,
            render: (r) => rs(r.profit || 0)
          },
          {
            key: 'margin',
            label: 'Margin %',
            labelUrdu: 'مارجن',
            align: 'center',
            render: (r) => `${r.marginPct || 0}%`
          }
        ],
        data: topProducts || [],
        summaryRows: [
          { label: 'Top Items Count', labelUrdu: 'پتھر آئٹمز تعداد', value: `${topProducts.length}` },
          { label: 'Top Items Revenue', labelUrdu: 'کل سیلز رقم', value: rs(topProducts.reduce((s, p) => s + (p.revenue || 0), 0)) },
          { label: 'Top Items Profit', labelUrdu: 'کل خام منافع', value: rs(topProducts.reduce((s, p) => s + (p.profit || 0), 0)) }
        ]
      };

    case 'EXPENSES':
      return {
        title: 'Factory Daily Expenses Audit Report',
        titleUrdu: 'روزانہ فیکٹری اخراجات آڈٹ رپورٹ',
        columns: [
          { key: 'date', label: 'Date', labelUrdu: 'تاریخ', align: 'center', render: (r) => r.date || '-' },
          { key: 'category', label: 'Expense Category', labelUrdu: 'مد / کیٹگری', bold: true, render: (r) => r.category || '-' },
          { key: 'paidTo', label: 'Paid To / Worker', labelUrdu: 'بنام / وصول کنندہ', render: (r) => r.paidTo || '-' },
          { key: 'remarks', label: 'Remarks / Reason', labelUrdu: 'تفصیل / وجہ خرچ', render: (r) => r.remarks || '-' },
          { key: 'paymentMethod', label: 'Method', labelUrdu: 'طریقہ', align: 'center', render: (r) => r.paymentMethod || 'Cash' },
          {
            key: 'amount',
            label: 'Amount (Rs.)',
            labelUrdu: 'رقم (روپے)',
            align: 'right',
            bold: true,
            render: (r) => rs(r.amount || 0)
          }
        ],
        data: expensesList || [],
        summaryRows: [
          { label: 'Total Expense Entries', labelUrdu: 'کل اندراجات', value: `${expensesList.length}` },
          { label: 'Total Factory Expenses', labelUrdu: 'کل فیکٹری اخراجات', value: rs(summary?.factoryExpenses) },
          { label: 'Deducted from Profit', labelUrdu: 'منافع سے منہا شدہ', value: rs(summary?.factoryExpenses) }
        ]
      };

    case 'INVOICES':
      return {
        title: 'Sales Invoices Audit & Register',
        titleUrdu: 'سیلز بلز تفصیل و آڈٹ رجسٹر',
        columns: [
          { key: 'invoiceNo', label: 'Invoice #', labelUrdu: 'بل نمبر', bold: true, render: (r) => r.invoiceNo || '-' },
          { key: 'date', label: 'Date', labelUrdu: 'تاریخ', align: 'center', render: (r) => r.date || '-' },
          { key: 'customerName', label: 'Customer Name', labelUrdu: 'گاہک کا نام', bold: true, render: (r) => r.customerName || '-' },
          { key: 'itemsCount', label: 'Items', labelUrdu: 'آئٹمز', align: 'center', render: (r) => `${r.itemsCount || 0}` },
          {
            key: 'totalSqFt',
            label: 'Total Units Sold',
            labelUrdu: 'کل فروخت یونٹس',
            align: 'right',
            render: (r) => `${Number(r.totalUnits || r.totalSqFt || 0).toLocaleString()} ${r.unit || 'Units'}`
          },
          { key: 'paymentMethod', label: 'Method', labelUrdu: 'طریقہ', align: 'center', render: (r) => r.paymentMethod || '-' },
          {
            key: 'grandTotal',
            label: 'Total Bill',
            labelUrdu: 'کل بل',
            align: 'right',
            bold: true,
            render: (r) => rs(r.grandTotal || 0)
          },
          {
            key: 'paidAmount',
            label: 'Received',
            labelUrdu: 'وصول',
            align: 'right',
            render: (r) => rs(r.paidAmount || 0)
          },
          {
            key: 'balanceDue',
            label: 'Balance Due',
            labelUrdu: 'بقایا',
            align: 'right',
            bold: true,
            render: (r) => rs(r.balanceDue || 0)
          }
        ],
        data: invoicesList || [],
        summaryRows: [
          { label: 'Total Bills Issued', labelUrdu: 'کل بلز تعداد', value: `${summary?.invoicesCount || 0}` },
          { label: 'Total Gross Billed', labelUrdu: 'کل بلنگ رقم', value: rs(summary?.grossSales) },
          { label: 'Direct Cash Inflow', labelUrdu: 'نقد وصولی', value: rs(summary?.cashSalesDirect) },
          { label: 'Credit Sales Outstanding', labelUrdu: 'ادھار بلنگ', value: rs(summary?.creditSalesDirect) }
        ]
      };

    default:
      return {
        title: 'Sales & Financial Insights Audit Report',
        titleUrdu: 'سیلز اور مالیاتی تجزیہ آڈٹ رپورٹ',
        columns: [],
        data: [],
        summaryRows: []
      };
  }
}

export default function SalesReportsView() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [horizon, setHorizon] = useState('Monthly');
  const [custom, setCustom] = useState({ from: todayStr(), to: todayStr() });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'CATEGORIES' | 'SUTARS' | 'CUSTOMERS' | 'PRODUCTS'
  const dbSettings = useLiveQuery(() => db.settings.toArray(), [])?.[0] || {};

  // Watch Dexie tables to trigger reactive refreshes
  const invoicesCount = useLiveQuery(() => db.invoices.count(), []) || 0;
  const paymentsCount = useLiveQuery(() => db.customer_payments.count(), []) || 0;
  const expensesCount = useLiveQuery(() => db.daily_expenses.count(), []) || 0;
  const returnsCount = useLiveQuery(() => db.returns.count(), []) || 0;

  useEffect(() => {
    loadReport();
  }, [horizon, custom.from, custom.to, invoicesCount, paymentsCount, expensesCount, returnsCount]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getComprehensiveSalesReport({ horizon, custom });
      setReport(data);
    } catch (err) {
      console.error('Error loading sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!report) return;
    const csv = exportSalesReportToCSV(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Marble-Factory-Sales-Report-${horizon.toLowerCase()}-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const json = exportSalesReportToJSON(report);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Marble-Factory-Sales-Report-${horizon.toLowerCase()}-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  const TH = {
    padding: '12px 14px',
    fontSize: '0.74rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-muted, #64748b)',
    background: 'var(--bg-primary, #f8fafc)',
    borderBottom: '1px solid var(--border-color, #e2e8f0)',
    whiteSpace: 'nowrap',
    textAlign: 'left'
  };

  const TD = {
    padding: '12px 14px',
    verticalAlign: 'middle',
    fontSize: '0.84rem',
    borderBottom: '1px solid var(--border-divider, #f1f5f9)',
    color: 'var(--text-primary, #0f172a)'
  };

  if (!report && loading) {
    return (
      <div style={{
        padding: '80px 20px',
        textAlign: 'center',
        color: 'var(--text-muted, #64748b)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #2563eb',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: '0 0 6px 0' }}>
          {tr('Calculating Sales & P&L Analytics...', 'سیلز رپورٹس و منافع تجزیہ لوڈ ہو رہا ہے...')}
        </h3>
        <p style={{ fontSize: '0.84rem', margin: 0 }}>
          {tr('Aggregating Dexie.js offline records, inventory costs & collections', 'آف لائن ریکارڈز، اسٹاک لاگت اور وصولی کا گوشوارہ تیار کیا جا رہا ہے')}
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const {
    summary = {},
    categoryBreakdown = [],
    sutarBreakdown = [],
    topCustomers = [],
    topProducts = [],
    expensesByCategory = [],
    expensesList = [],
    invoicesList = [],
    timelineSeries = []
  } = report || {};

  // ── Dynamic Print Configuration based on activeTab (Pure Helper, No Hook) ──
  const printConfig = getPrintConfig({
    activeTab,
    categoryBreakdown,
    sutarBreakdown,
    topCustomers,
    topProducts,
    expensesList,
    invoicesList,
    summary
  });


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxWidth: '1440px',
        margin: '0 auto',
        paddingBottom: '30px'
      }}
    >
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. SEAMLESS HERO HEADER (Matching Dashboard & general_background.jpg)       */}
      {/* ------------------------------------------------------------------------- */}
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
        {/* Left: Overview Breadcrumb + Title + Subtitle */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#2563eb',
              marginBottom: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{language === 'ur' ? 'مالی تجزیہ و سیلز رپورٹس' : 'Financial Insights & Analytics'}</span>
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
              <BarChart3 size={24} />
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
                {language === 'ur' ? 'سیلز رپورٹس و منافع تجزیہ' : 'Sales Reports & Profit Analysis'}{' '}
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary, #64748b)',
                    fontFamily: 'var(--font-urdu, inherit)'
                  }}
                >
                  {language === 'ur' ? '' : '(سیلز و منافع)'}
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
                {language === 'ur'
                  ? 'مصدقہ آف لائن سیلز، اسٹاک لاگت (COGS) اور خالص منافع کا جامع مالیاتی گوشوارہ'
                  : 'Verified offline sales audits, stone inventory costs (COGS), margins & net profit analytics'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons (Export & Print) */}
        <div className="no-print" style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="btn btn-secondary"
            style={{
              fontWeight: 700,
              fontSize: '0.84rem',
              padding: '9px 16px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={15} />
            <span>{tr('Export Data', 'ایکسپورٹ ڈیٹا')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="btn btn-primary"
            style={{
              background: '#2563eb',
              borderColor: '#2563eb',
              fontWeight: 700,
              fontSize: '0.86rem',
              padding: '9px 18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} />
            <span>{tr('Print Audit', 'پرنٹ رپورٹ')}</span>
          </button>
        </div>

        {/* Right: Background Marble Image with seamless fade mask using general_background */}
        <div
          style={{
            position: 'absolute',
            right: '0',
            top: '-15px',
            bottom: '-15px',
            width: '50%',
            maxWidth: '520px',
            backgroundImage: `url('./general_background.jpg')`,
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

      {/* ------------------------------------------------------------------------- */}
      {/* 2. PRIMARY 4 KPI CARDS (Dashboard .kpi-card-grid & .kpi-metric-card)      */}
      {/* ------------------------------------------------------------------------- */}
      <div className="kpi-card-grid">
        {/* KPI 1: TOTAL GROSS SALES */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon blue">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">{tr('Total Sales', 'Total Sales')}</span>
              <span className="kpi-metric-label-ur">(کل سیلز بلنگ)</span>
            </div>
            <div className="kpi-metric-value font-mono">{rs(summary.grossSales)}</div>
          </div>
        </div>

        {/* KPI 2: NET PROFIT (خالص منافع) */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon green">
            <DollarSign size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">{tr('Net Profit', 'Net Profit')}</span>
              <span className="kpi-metric-label-ur">(خالص منافع P&L)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: summary.netProfit >= 0 ? '#059669' : '#dc2626' }}>
              {rs(summary.netProfit)}
            </div>
          </div>
        </div>

        {/* KPI 3: CASH & RECOVERIES */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon indigo">
            <Wallet size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">{tr('Cash Inflow', 'Cash Inflow')}</span>
              <span className="kpi-metric-label-ur">(کل وصول شدہ رقم)</span>
            </div>
            <div className="kpi-metric-value font-mono">{rs(summary.totalCashInflow)}</div>
          </div>
        </div>

        {/* KPI 4: FACTORY EXPENSES & DEDUCTIONS */}
        <div className="kpi-metric-card">
          <div className="kpi-metric-icon red">
            <TrendingDown size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">{tr('Expenses', 'Expenses')}</span>
              <span className="kpi-metric-label-ur">(اخراجات و کٹوتیاں)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#dc2626' }}>
              {rs(summary.factoryExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 3. TIME HORIZON FILTER BAR (Placed directly below Cards)                  */}
      {/* ------------------------------------------------------------------------- */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-card, #ffffff)',
          padding: '12px 18px',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={17} style={{ color: '#2563eb' }} />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--text-secondary, #475569)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {tr('Report Horizon', 'مدت انتخاب')}:
            </span>
          </div>

          {/* Horizon Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-primary, #f8fafc)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '0.78rem'
            }}
          >
            {HORIZONS.map((h) => {
              const active = horizon === h.key;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setHorizon(h.key)}
                  style={{
                    background: active ? 'var(--bg-card, #ffffff)' : 'transparent',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 14px',
                    fontWeight: active ? 800 : 600,
                    color: active ? '#2563eb' : 'var(--text-secondary, #64748b)',
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {language === 'ur' ? h.labelUr : h.labelEn}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Picker Inputs */}
          {horizon === 'Custom' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '6px' }}>
              <input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom({ ...custom, from: e.target.value })}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  fontSize: '0.82rem',
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #0f172a)',
                  outline: 'none',
                  fontWeight: 600
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                {tr('to', 'تا')}
              </span>
              <input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                style={{
                  height: '34px',
                  padding: '0 10px',
                  fontSize: '0.82rem',
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #0f172a)',
                  outline: 'none',
                  fontWeight: 600
                }}
              />
            </div>
          )}
        </div>

        {/* Live Filter Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted, #64748b)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={14} />
            <span>
              {tr('Active Period', 'فعال دورانیہ')}:{' '}
              <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{report?.label}</strong>
            </span>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCircle2 size={12} />
            {summary.invoicesCount || 0} {tr('Bills Processed', 'بلز تجزیہ شدہ')}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 4. REAL OPERATIONAL ALERT BANNER (Directly below Report Horizon)          */}
      {/* ------------------------------------------------------------------------- */}
      {(() => {
        const isLoss = summary.netProfit < 0;
        const isLowMargin = summary.netMarginPct < 10 && summary.grossSales > 0;
        const isHighCredit = summary.creditRatio > 60 && summary.grossSales > 0;
        const hasReturns = (summary.salesReturnsAmount || 0) > 0;

        if (!isLoss && !isLowMargin && !isHighCredit && !hasReturns) {
          return (
            <div
              className="dash-alert-strip"
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: '#059669'
              }}
            >
              <div className="dash-alert-message" style={{ color: '#059669' }}>
                <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>
                  {language === 'ur'
                    ? `تمام مالی اشارے مثبت ہیں — خالص منافع مارجن ${summary.netMarginPct}% ہے اور کیش فلو تسلی بخش ہے`
                    : `Strong Financial Health — Net profit margin is healthy at ${summary.netMarginPct}% with balanced cash flow`}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#059669',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle2 size={13} />
                {tr('Healthy Operations', 'مثالی کارکردگی')}
              </span>
            </div>
          );
        }

        return (
          <div className="dash-alert-strip dash-alert-multi">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                <span>{language === 'ur' ? 'مالیاتی احتیاطی الرٹس' : 'Financial Insights & Alerts'}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>
                {tr('Active Observations', 'ضروری توجہ')}
              </span>
            </div>

            {isLoss && (
              <div className="dash-alert-row" style={{ paddingTop: '6px', borderTop: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div className="dash-alert-message">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    {language === 'ur'
                      ? `اس مدت میں اخراجات خام منافع سے زیادہ ہیں (خالص نقصان: ${rs(Math.abs(summary.netProfit))})`
                      : `Operating expenses exceeded gross profit for this period (Net Loss: ${rs(Math.abs(summary.netProfit))})`}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>
                  {tr('Review Expenses', 'اخراجات چیک کریں')}
                </span>
              </div>
            )}

            {isHighCredit && (
              <div className="dash-alert-row" style={{ paddingTop: '6px', borderTop: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div className="dash-alert-message" style={{ color: '#b45309' }}>
                  <Wallet size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>
                    {language === 'ur'
                      ? `کل سیلز کا ${summary.creditRatio}% ادھار کھاتوں پر ہے (${rs(summary.creditSalesDirect)}) — وصولی مہم تیز کریں`
                      : `${summary.creditRatio}% of sales are on credit accounts (${rs(summary.creditSalesDirect)}) — Prioritize recovery`}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>
                  {tr('Credit Exposure', 'ادھار دباؤ')}
                </span>
              </div>
            )}

            {hasReturns && (
              <div className="dash-alert-row" style={{ paddingTop: '6px', borderTop: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <div className="dash-alert-message" style={{ color: '#b45309' }}>
                  <Boxes size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>
                    {language === 'ur'
                      ? `سیلز واپسی کی مد میں ${rs(summary.salesReturnsAmount)} کی کٹوتی ہوئی ہے`
                      : `Sales returns resulted in ${rs(summary.salesReturnsAmount)} revenue deduction`}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>
                  {tr('Returns Tracked', 'واپسی ریکارڈ')}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ------------------------------------------------------------------------- */}
      {/* 5. SALES VS WASOOLI VS EXPENSE TRAJECTORY (Graph moved UP above mixes)    */}
      {/* ------------------------------------------------------------------------- */}
      {timelineSeries && timelineSeries.length > 1 && (
        <div className="dash-card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="dash-card-header">
            <div>
              <h3 className="dash-card-title">
                <BarChart3 size={18} style={{ color: '#2563eb' }} />
                <span>{language === 'ur' ? 'سیلز بمقابلہ وصولی و اخراجات کا رجحان' : 'Sales vs Wasooli vs Expense Trajectory'}</span>
              </h3>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                {language === 'ur'
                  ? 'منتخب کردہ دورانیے میں روزانہ / ماہانہ مالیاتی اتار چڑھاؤ'
                  : 'Daily and periodic timeline distribution across the current reporting horizon'}
              </div>
            </div>

            {/* Chart Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563eb' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 700 }}>{tr('Sales (سیلز)', 'سیلز')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 700 }}>{tr('Wasooli (وصولی)', 'وصولی')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 700 }}>{tr('Expenses (خرچ)', 'اخراجات')}</span>
              </div>
            </div>
          </div>

          {/* SVG Multi-Line Chart Canvas */}
          {(() => {
            const maxVal = Math.max(...timelineSeries.map((p) => Math.max(p.sales || 0, p.wasooli || 0, p.expenses || 0)), 1000);
            const w = 780;
            const h = 160;
            const step = timelineSeries.length > 1 ? (w - 80) / (timelineSeries.length - 1) : 100;
            const monthName = timelineSeries.find(p => p.fullMonthName)?.fullMonthName || timelineSeries[0]?.monthName || '';

            const salesPoints = timelineSeries.map((p, i) => `${40 + i * step},${h - 30 - ((p.sales || 0) / maxVal) * (h - 55)}`).join(' ');
            const wasooliPoints = timelineSeries.map((p, i) => `${40 + i * step},${h - 30 - ((p.wasooli || 0) / maxVal) * (h - 55)}`).join(' ');
            const expPoints = timelineSeries.map((p, i) => `${40 + i * step},${h - 30 - ((p.expenses || 0) / maxVal) * (h - 55)}`).join(' ');

            return (
              <div style={{ width: '100%', overflowX: 'auto', padding: '6px 0' }}>
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '160px', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="30" y1="25" x2={w - 20} y2="25" stroke="var(--border-color, #e2e8f0)" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="30" y1={h / 2} x2={w - 20} y2={h / 2} stroke="var(--border-color, #e2e8f0)" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="30" y1={h - 30} x2={w - 20} y2={h - 30} stroke="var(--border-color, #cbd5e1)" />

                  {/* Polylines */}
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={salesPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={wasooliPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={expPoints}
                  />

                  {/* Dot Markers & Interactive Points */}
                  {timelineSeries.map((p, i) => {
                    const cx = 40 + i * step;
                    const cySales = h - 30 - ((p.sales || 0) / maxVal) * (h - 55);
                    const cyWasooli = h - 30 - ((p.wasooli || 0) / maxVal) * (h - 55);
                    const dateDisplay = p.dayNumber !== undefined ? `${p.dayNumber}` : p.label;
                    const fullDateTooltip = p.fullLabel || `${p.label} ${monthName}`;

                    return (
                      <g key={i} style={{ cursor: 'pointer' }}>
                        <title>{`${fullDateTooltip}\nSales: Rs. ${(p.sales || 0).toLocaleString()}\nWasooli: Rs. ${(p.wasooli || 0).toLocaleString()}\nExpenses: Rs. ${(p.expenses || 0).toLocaleString()}`}</title>
                        <circle cx={cx} cy={cySales} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx={cx} cy={cyWasooli} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                        <text
                          x={cx}
                          y={h - 14}
                          textAnchor="middle"
                          fontSize={timelineSeries.length > 20 ? "9" : "10"}
                          fill="var(--text-secondary, #64748b)"
                          fontWeight="700"
                        >
                          {dateDisplay}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Clean Month Badge at bottom side */}
                {monthName && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    padding: '4px 12px 0 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#2563eb'
                  }}>
                    <span>{language === 'ur' ? `ماہ: ${monthName}` : `Month: ${monthName}`}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 6. CASH VS CREDIT SALES MIX | COGS & PROFIT STRUCTURE (Dual Panel)        */}
      {/* ------------------------------------------------------------------------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Left: Cash vs Credit Sales Breakdown */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="dash-card-header">
            <h3 className="dash-card-title">
              <Wallet size={18} style={{ color: '#059669' }} />
              <span>{language === 'ur' ? 'نقد بمقابلہ ادھار تناسب' : 'Cash vs Credit Sales Mix'}</span>
            </h3>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#2563eb',
                background: 'rgba(37,99,235,0.08)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              {summary.cashRatio}% {tr('Cash', 'نقد')} / {summary.creditRatio}% {tr('Credit', 'ادھار')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Visual Bar Track */}
            <div
              style={{
                height: '10px',
                borderRadius: '5px',
                background: 'rgba(239,68,68,0.25)',
                overflow: 'hidden',
                display: 'flex',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${summary.cashRatio}%`,
                  background: '#10b981',
                  transition: 'width 0.4s ease'
                }}
                title={`Cash: ${summary.cashRatio}%`}
              />
              <div
                style={{
                  height: '100%',
                  width: `${summary.creditRatio}%`,
                  background: '#ef4444',
                  transition: 'width 0.4s ease'
                }}
                title={`Credit: ${summary.creditRatio}%`}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                  {tr('On-Spot Cash Billed', 'نقد بلنگ')}:
                </span>
                <strong style={{ color: '#059669' }} className="font-mono">{rs(summary.cashSalesDirect)}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                  {tr('Credit Udhar Billed', 'ادھار کھاتہ')}:
                </span>
                <strong style={{ color: '#dc2626' }} className="font-mono">{rs(summary.creditSalesDirect)}</strong>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-primary, #f8fafc)',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem'
              }}
            >
              <span style={{ color: 'var(--text-muted, #64748b)' }}>
                {tr('Recovered Khata Wasooli in Period', 'مدت کے دوران وصول شدہ ادھار')}:
              </span>
              <strong style={{ color: '#2563eb' }} className="font-mono">{rs(summary.wasooliCollections)}</strong>
            </div>
          </div>
        </div>

        {/* Right: Cost of Goods Sold (COGS) & Margins Structure */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="dash-card-header">
            <h3 className="dash-card-title">
              <Layers size={18} style={{ color: '#6366f1' }} />
              <span>{language === 'ur' ? 'ماربل لاگت و منافع گوشوارہ' : 'COGS & Profit Structure'}</span>
            </h3>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16,185,129,0.1)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              {summary.grossMarginPct}% {tr('Gross Margin', 'خام مارجن')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Total Stone Cost (COGS)', 'کل مال خریداری لاگت')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  {rs(summary.totalCOGS)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Net Sales Revenue', 'خالص سیلز آمدن')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb' }}>
                  {rs(summary.netSales)}
                </div>
              </div>
            </div>

            {/* Step-by-step financial formula banner */}
            <div
              style={{
                background: 'var(--bg-primary, #f8fafc)',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
                fontSize: '0.76rem',
                color: 'var(--text-secondary, #64748b)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <span>{tr('Gross Profit', 'خام منافع')}: <strong style={{ color: '#059669' }}>{rs(summary.grossProfit)}</strong></span>
              <span>—</span>
              <span
                onClick={() => setActiveTab('EXPENSES')}
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title={tr('Click to view daily expenses breakdown', 'اخراجات کی تفصیل دیکھنے کے لیے کلک کریں')}
              >
                {tr('Expenses', 'اخراجات')}: <strong style={{ color: '#dc2626', textDecoration: 'underline' }}>{rs(summary.factoryExpenses)}</strong>
              </span>
              <span>=</span>
              <span>{tr('Net Munafa', 'خالص منافع')}: <strong style={{ color: summary.netProfit >= 0 ? '#059669' : '#dc2626' }}>{rs(summary.netProfit)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 7. DRILLDOWN EXPLORATION TABS (Matching Dashboard Flat Table Structure)   */}
      {/* ------------------------------------------------------------------------- */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Modern Tab Headers */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-primary, #f8fafc)',
            padding: '8px 12px 0 12px',
            flexWrap: 'wrap'
          }}
        >
          {[
            { id: 'OVERVIEW', label: tr('Category Performance', 'اقسام ماربل کارکردگی'), icon: Layers, count: categoryBreakdown.length },
            { id: 'SUTARS', label: tr('Sutar Thickness Breakdown', 'سوتر موٹائی تجزیہ'), icon: SlidersHorizontal, count: sutarBreakdown.length },
            { id: 'CUSTOMERS', label: tr('Top Customers Khata', 'نمبر ون گاہک کھاتہ'), icon: Users, count: topCustomers.length },
            { id: 'PRODUCTS', label: tr('Top Stone Items', 'نمبر ون پتھر و مصنوعات'), icon: Award, count: topProducts.length },
            { id: 'EXPENSES', label: tr('Daily Expenses Breakdown', 'روزانہ فیکٹری اخراجات'), icon: Receipt, count: expensesList.length },
            { id: 'INVOICES', label: tr('Sales Invoices List', 'سیلز بلز تفصیل'), icon: FileSpreadsheet, count: invoicesList.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 18px',
                  fontSize: '0.84rem',
                  fontWeight: active ? 800 : 600,
                  color: active ? '#2563eb' : 'var(--text-muted, #64748b)',
                  borderBottom: active ? '3px solid #2563eb' : '3px solid transparent',
                  background: active ? 'var(--bg-card, #ffffff)' : 'transparent',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: active ? '#2563eb' : 'var(--border-color, #e2e8f0)',
                      color: active ? '#ffffff' : 'var(--text-muted, #64748b)'
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: CATEGORY BREAKDOWN TABLE ───────────────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>{tr('Stone Category', 'ماربل / ٹائل قسم')}</th>
                  <th style={TH}>{tr('Revenue', 'سیلز رقم')}</th>
                  <th style={TH}>{tr('Unit Sold', 'یونٹس فروخت')}</th>
                  <th style={TH}>{tr('Avg Rate / SqFt', 'اوسط ریٹ')}</th>
                  <th style={TH}>{tr('Est. Cost (COGS)', 'خام لاگت')}</th>
                  <th style={TH}>{tr('Gross Profit', 'خام منافع')}</th>
                  <th style={TH}>{tr('Margin %', 'مارجن')}</th>
                  <th style={TH}>{tr('Sales Share', 'سیلز حصہ')}</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      {tr('No category transactions found in this horizon.', 'اس مدت میں کوئی ریکارڈ موجود نہیں۔')}
                    </td>
                  </tr>
                ) : (
                  categoryBreakdown.map((cat, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-primary)' }}>{cat.name}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {rs(cat.revenue)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {(cat.quantity || cat.sqFt || 0).toLocaleString()} {cat.unit || (cat.name === 'Tiles' ? 'Meters' : (['Flowers', 'Panels', 'Tile Accessories', 'Other Accessories', 'Tukri', 'Kalm'].includes(cat.name) ? 'Pieces' : (['Borders', 'Kali Patti'].includes(cat.name) ? 'R.Ft' : 'Sq.Ft')))}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>{rs(cat.avgRatePerSqFt)}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{rs(cat.cogs)}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                        {rs(cat.profit)}
                      </td>
                      <td style={{ ...TD }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(16,185,129,0.1)',
                            color: '#059669'
                          }}
                        >
                          {cat.marginPct}%
                        </span>
                      </td>
                      <td style={{ ...TD, minWidth: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              borderRadius: '3px',
                              background: 'var(--border-color, #e2e8f0)',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ height: '100%', width: `${cat.sharePct}%`, background: '#2563eb' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', width: '32px' }}>
                            {cat.sharePct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: SUTAR THICKNESS BREAKDOWN CARDS ────────────────────── */}
        {activeTab === 'SUTARS' && (
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              {tr(
                'Distribution of marble slabs sold across standardized Sutar thickness categories:',
                'فیکٹری کے معیار کے مطابق مختلف سوتر موٹائیوں میں سیلز، فٹ اور منافع کی تفصیل:'
              )}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '14px'
              }}
            >
              {sutarBreakdown.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-primary, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '12px',
                    padding: '16px 18px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {s.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        background: 'rgba(37,99,235,0.1)',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      {s.sharePct}% {tr('share', 'حصہ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                    {rs(s.revenue)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span>{tr('Units Sold', 'فروخت یونٹس')}: <strong>{(s.quantity || s.sqFt || 0).toLocaleString()} {s.name.includes('Tiles') || s.name.includes('Patti') ? tr('Units', 'یونٹس') : 'Sq.Ft'}</strong></span>
                    <span>{tr('Profit', 'منافع')}: <strong style={{ color: '#059669' }}>{rs(s.profit)}</strong></span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-color, #e2e8f0)', marginTop: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.sharePct}%`, background: '#2563eb' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: TOP CUSTOMERS KHATA RANKING ────────────────────────── */}
        {activeTab === 'CUSTOMERS' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>{tr('Customer / Khata Name', 'گاہک کا نام و کھاتہ')}</th>
                  <th style={TH}>{tr('Phone', 'فون نمبر')}</th>
                  <th style={TH}>{tr('City', 'شہر')}</th>
                  <th style={TH}>{tr('Total Billed', 'کل بلنگ رقم')}</th>
                  <th style={TH}>{tr('Invoices', 'بلز تعداد')}</th>
                  <th style={TH}>{tr('Total Units Sold', 'کل فروخت یونٹس')}</th>
                  <th style={TH}>{tr('Current Balance Due', 'موجودہ بقایا ادھار')}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      {tr('No customer sales recorded in this horizon.', 'اس مدت میں کوئی ریکارڈ نہیں۔')}
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((cust, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '36px' }}>{idx + 1}</td>
                      <td style={{ ...TD, fontWeight: 800, color: 'var(--text-primary)' }}>{cust.name}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{cust.phone}</td>
                      <td style={{ ...TD, color: 'var(--text-muted)' }}>{cust.city}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {rs(cust.revenue)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>{cust.billsCount}</td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {(cust.totalUnits || cust.sqFt || 0).toLocaleString()} {tr('Units', 'یونٹس')}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800 }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.78rem',
                            background: cust.balanceDue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: cust.balanceDue > 0 ? '#dc2626' : '#059669'
                          }}
                        >
                          {rs(cust.balanceDue)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 4: TOP STONE ITEMS MASTER ─────────────────────────────── */}
        {activeTab === 'PRODUCTS' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>{tr('Code', 'کوڈ')}</th>
                  <th style={TH}>{tr('Stone Name', 'ماربل / پتھر کا نام')}</th>
                  <th style={TH}>{tr('Category', 'کیٹگری')}</th>
                  <th style={TH}>{tr('Unit Sold', 'یونٹس فروخت')}</th>
                  <th style={TH}>{tr('Revenue', 'سیلز رقم')}</th>
                  <th style={TH}>{tr('Est. Cost', 'خام لاگت')}</th>
                  <th style={TH}>{tr('Gross Profit', 'خام منافع')}</th>
                  <th style={TH}>{tr('Margin %', 'مارجن')}</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      {tr('No product items sold in this horizon.', 'اس مدت میں کوئی ریکارڈ نہیں۔')}
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '36px' }}>{idx + 1}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                          {p.code}
                        </span>
                      </td>
                      <td style={{ ...TD, fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</td>
                      <td style={{ ...TD, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.category}</td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {(p.quantity || p.sqFt || 0).toLocaleString()} {p.unit || (p.category === 'Tiles' ? 'Meters' : (['Flowers', 'Panels', 'Tile Accessories', 'Other Accessories', 'Tukri', 'Kalm'].includes(p.category) ? 'Pieces' : (['Borders', 'Kali Patti'].includes(p.category) ? 'R.Ft' : 'Sq.Ft')))}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {rs(p.revenue)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{rs(p.cogs)}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>
                        {rs(p.profit)}
                      </td>
                      <td style={{ ...TD }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(16,185,129,0.1)',
                            color: '#059669'
                          }}
                        >
                          {p.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 5: DAILY EXPENSES BREAKDOWN ──────────────────────────── */}
        {activeTab === 'EXPENSES' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top KPI Cards for Expenses */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px'
              }}
            >
              <div
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Total Factory Expenses', 'کل فیکٹری اخراجات')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  {rs(summary.factoryExpenses)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Deducted directly from Gross Profit', 'خام منافع سے منہا شدہ رقم')}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Expense Records Count', 'کل اخراجات اندراجات')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {expensesList.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Vouchers & entries in selected period', 'منتخب مدت میں کل واؤچرز')}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Expense / Net Sales Ratio', 'اخراجات تا سیلز تناسب')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                  {summary.netSales > 0 ? Math.round((summary.factoryExpenses / summary.netSales) * 100) : 0}%
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Portion of sales consumed by expenses', 'سیلز کا اخراجات پر خرچ ہونے والا حصہ')}
                </div>
              </div>
            </div>

            {/* Category Breakdown Badges */}
            {expensesByCategory.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.84rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
                  {tr('Expense Categories Distribution (اخراجات کی مدیں):', 'اخراجات کی مدیں:')}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {expensesByCategory.map((cat, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-primary, #f8fafc)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cat.category}</span>
                      <strong style={{ color: '#dc2626' }} className="font-mono">{rs(cat.totalAmount)}</strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'rgba(220,38,38,0.1)',
                          color: '#dc2626',
                          fontWeight: 700
                        }}
                      >
                        {cat.sharePct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itemized Expenses Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>#</th>
                    <th style={TH}>{tr('Date', 'تاریخ')}</th>
                    <th style={TH}>{tr('Category / Head', 'مد / کیٹگری')}</th>
                    <th style={TH}>{tr('Paid To / Worker', 'بنام / وصول کنندہ')}</th>
                    <th style={TH}>{tr('Remarks / Reason', 'تفصیل / وجہ خرچ')}</th>
                    <th style={TH}>{tr('Payment Method', 'طریقہ')}</th>
                    <th style={{ ...TH, textAlign: 'right' }}>{tr('Amount (Rs.)', 'رقم (روپے)')}</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                        {tr('No daily factory expenses recorded in this horizon.', 'اس مدت میں کوئی روزانہ اخراجات ریکارڈ نہیں ہیں۔')}
                      </td>
                    </tr>
                  ) : (
                    expensesList.map((exp, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '36px' }}>{idx + 1}</td>
                        <td style={{ ...TD, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {exp.date}
                        </td>
                        <td style={{ ...TD, fontWeight: 700, color: 'var(--text-primary)' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.76rem',
                              background: 'rgba(37,99,235,0.08)',
                              color: '#2563eb'
                            }}
                          >
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ ...TD, fontWeight: 600 }}>{exp.paidTo || '-'}</td>
                        <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{exp.remarks || '-'}</td>
                        <td style={{ ...TD, textAlign: 'center', fontSize: '0.78rem' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {exp.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>
                          {rs(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 6: SALES INVOICES LIST ────────────────────────────────── */}
        {activeTab === 'INVOICES' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Invoices Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px'
              }}
            >
              <div
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Total Invoices Issued', 'کل بلز جاری کردہ')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                  {invoicesList.length}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Billed in current period', 'منتخب مدت میں جاری شدہ')}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Total Gross Billed', 'کل بلنگ رقم')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                  {rs(summary.grossSales)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Before returns deductions', 'واپسی کٹوتی سے پہلے')}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Direct Cash Received', 'نقد وصول شدہ')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  {rs(summary.cashSalesDirect)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {summary.cashRatio}% {tr('of total billed', 'کل بلنگ کا')}
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '16px'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {tr('Unpaid Credit (Udhar)', 'ادھار کھاتہ بلنگ')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  {rs(summary.creditSalesDirect)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {summary.creditRatio}% {tr('credit exposure', 'ادھار بلنگ تناسب')}
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>#</th>
                    <th style={TH}>{tr('Invoice #', 'بل نمبر')}</th>
                    <th style={TH}>{tr('Date', 'تاریخ')}</th>
                    <th style={TH}>{tr('Customer / Khata', 'گاہک کا نام')}</th>
                    <th style={TH}>{tr('Items', 'آئٹمز')}</th>
                    <th style={TH}>{tr('Total Units Sold', 'کل فروخت یونٹس')}</th>
                    <th style={TH}>{tr('Payment Method', 'طریقہ')}</th>
                    <th style={TH}>{tr('Status', 'حیثیت')}</th>
                    <th style={{ ...TH, textAlign: 'right' }}>{tr('Total Bill', 'کل بل')}</th>
                    <th style={{ ...TH, textAlign: 'right' }}>{tr('Paid', 'وصول')}</th>
                    <th style={{ ...TH, textAlign: 'right' }}>{tr('Balance Due', 'بقایا')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesList.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                        {tr('No sales invoices found in this horizon.', 'اس مدت میں کوئی سیلز بل موجود نہیں ہے۔')}
                      </td>
                    </tr>
                  ) : (
                    invoicesList.map((inv, idx) => (
                      <tr
                        key={idx}
                        style={{
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '36px' }}>{idx + 1}</td>
                        <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                          {inv.invoiceNo}
                        </td>
                        <td style={{ ...TD, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {inv.date}
                        </td>
                        <td style={{ ...TD, fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div>{inv.customerName}</div>
                          {inv.customerPhone && inv.customerPhone !== '-' && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {inv.customerPhone}
                            </div>
                          )}
                        </td>
                        <td style={{ ...TD, textAlign: 'center', fontFamily: 'monospace' }}>{inv.itemsCount}</td>
                        <td style={{ ...TD, fontFamily: 'monospace' }}>
                          {(inv.totalUnits || inv.totalSqFt || 0).toLocaleString()} {inv.unit || tr('Units', 'یونٹس')}
                        </td>
                        <td style={{ ...TD, textAlign: 'center', fontSize: '0.78rem' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td style={{ ...TD, textAlign: 'center', fontSize: '0.76rem' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '5px',
                              fontWeight: 700,
                              background: inv.balanceDue > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: inv.balanceDue > 0 ? '#dc2626' : '#059669'
                            }}
                          >
                            {inv.balanceDue > 0 ? tr('Partial / Credit', 'ادھار بقایا') : tr('Paid (نقد ادا)', 'ادا شدہ')}
                          </span>
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                          {rs(inv.grandTotal)}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>
                          {rs(inv.paidAmount)}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: inv.balanceDue > 0 ? '#dc2626' : '#059669' }}>
                          {rs(inv.balanceDue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 8. EXPORT MODAL (Clean Glassmorphism Modal matching Dashboard)            */}
      {/* ------------------------------------------------------------------------- */}
      {exportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: '16px'
          }}
          onClick={() => setExportModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExportModalOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(37,99,235,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}
              >
                <Download size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {tr('Export Financial Reports', 'سیلز و منافع رپورٹ ایکسپورٹ')}
              </h3>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {tr(
                'Download structured audit files for spreadsheet accounting or offline archival:',
                'رپورٹ کو ایکسل، سی ایس وی یا ڈیٹا فائل کی صورت میں ڈاؤن لوڈ کریں:'
              )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* PDF Print / Save Option */}
              <button
                type="button"
                onClick={() => {
                  setExportModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.02) 100%)',
                  border: '1.5px solid #2563eb',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <Printer size={24} style={{ color: '#2563eb', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{tr('Print / Save PDF Executive Sales Summary', 'پی ڈی ایف سیلز و منافع خلاصہ رپورٹ')}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', background: '#2563eb', color: '#fff', borderRadius: '4px' }}>Recommended</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {tr('Clean, aligned document layout ready for browser PDF export & printing', 'بہترین فارمیٹنگ اور مکمل ڈیٹا کے ساتھ پرنٹ اور پی ڈی ایف سیو کے لیے')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileSpreadsheet size={24} style={{ color: '#10b981', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800 }}>{tr('Microsoft Excel / CSV Spreadsheet', 'ایکسل یا CSV فائل')}</div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {tr('Formatted tables with UTF-8 BOM Urdu support', 'مکمل ٹیبلز اور اردو فونٹ سپورٹ کے ساتھ')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadJSON}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <Download size={24} style={{ color: '#2563eb', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800 }}>{tr('JSON Raw Financial Dataset', 'JSON را ڈیٹا فائل')}</div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {tr('Complete nested aggregations & metrics structure', 'اینالیٹکس و میٹرکس کا مکمل تکنیکی ڈیٹا')}
                  </span>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px' }}>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {tr('Close', 'بند کریں')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Universal Report Print Modal for Sales Reports (Dynamic per activeTab) */}
      <UniversalReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={printConfig.title}
        titleUrdu={printConfig.titleUrdu}
        subtitle={`Period: ${horizon} ${horizon === 'Custom' ? `(${custom.from} to ${custom.to})` : ''}`}
        factorySettings={dbSettings}
        kpis={[
          { label: 'Gross Sales', labelUrdu: 'کل سیلز', value: rs(summary?.grossSales), color: '#2563eb' },
          { label: 'Net Sales', labelUrdu: 'خالص سیلز', value: rs(summary?.netSales), color: '#059669' },
          { label: 'Total Expenses', labelUrdu: 'کل اخراجات', value: rs(summary?.factoryExpenses), color: '#dc2626' },
          {
            label: 'Net Operating Profit',
            labelUrdu: 'خالص منافع',
            value: rs(summary?.netProfit),
            color: (summary?.netProfit || 0) >= 0 ? '#059669' : '#dc2626'
          }
        ]}
        columns={printConfig.columns}
        data={printConfig.data}
        summaryRows={printConfig.summaryRows}
      />
    </div>
  );
}

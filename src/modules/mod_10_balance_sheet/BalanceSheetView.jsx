import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  DollarSign,
  Users,
  Truck,
  Boxes,
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Layers,
  ShieldCheck,
  Plus,
  Minus,
  Equal,
  ChevronRight,
  Package,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import { db } from '../../db/index';
import { useLanguage } from '../../context/LanguageContext';
import UniversalReportPrintModal from '../../components/UniversalReportPrintModal';
import {
  getComprehensiveBalanceSheet,
  exportBalanceSheetToCSV,
  exportBalanceSheetToJSON
} from './balanceSheetService';

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString();
const todayStr = () => new Date().toISOString().slice(0, 10);

const HORIZONS = [
  { key: 'Daily', labelEn: 'Daily', labelUr: 'آج' },
  { key: 'Weekly', labelEn: 'Weekly', labelUr: 'اس ہفتے' },
  { key: 'Monthly', labelEn: 'Monthly', labelUr: 'اس ماہ' },
  { key: 'Quarterly', labelEn: 'Quarterly', labelUr: 'سہ ماہی' },
  { key: 'Half-Yearly', labelEn: 'Half-Yearly', labelUr: 'شش ماہی' },
  { key: 'Yearly', labelEn: 'Yearly', labelUr: 'اس سال' },
  { key: 'Custom', labelEn: 'Custom', labelUr: 'مخصوص تاریخ' }
];

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

/**
 * Pure helper function to get print configuration dynamically based on activeTab.
 * Defined outside component to strictly follow React Rules of Hooks.
 */
function getPrintConfig({
  activeTab,
  report,
  summary = {},
  stockCategoryBreakdown = [],
  stockItemsList = [],
  debtorCustomers = [],
  advanceCustomers = [],
  supplierPayablesList = []
}) {
  switch (activeTab) {
    case 'STOCK':
      return {
        title: 'Yard Inventory Valuation Audit Report (Sale Price Basis)',
        titleUrdu: 'ماربل و ٹائلز اسٹاک ویلیویشن رپورٹ (سیل ریٹ کے مطابق)',
        columns: [
          { key: 'code', label: 'Code', labelUrdu: 'کوڈ', render: (r) => r.code || '-' },
          { key: 'name', label: 'Stone Item Name', labelUrdu: 'پتھر کا نام', bold: true, render: (r) => r.name || '-' },
          { key: 'category', label: 'Category', labelUrdu: 'کیٹیگری', render: (r) => r.category || '-' },
          {
            key: 'quantity',
            label: 'Stock Qty',
            labelUrdu: 'تعداد / فٹ',
            align: 'right',
            render: (r) => `${Number(r.quantity || 0).toLocaleString()} ${r.unit || 'sqft'}`
          },
          {
            key: 'saleRate',
            label: 'Sale Rate',
            labelUrdu: 'سیل ریٹ',
            align: 'right',
            render: (r) => rs(r.saleRate || 0)
          },
          {
            key: 'saleValue',
            label: 'Total Sale Value',
            labelUrdu: 'کل مارکیٹ ویلیو',
            align: 'right',
            bold: true,
            render: (r) => rs(r.saleValue || 0)
          },
          {
            key: 'costValue',
            label: 'Purchase Cost (COGS)',
            labelUrdu: 'خریداری لاگت',
            align: 'right',
            render: (r) => rs(r.costValue || 0)
          },
          {
            key: 'margin',
            label: 'Unrealized Profit',
            labelUrdu: 'منافع مارجن',
            align: 'right',
            bold: true,
            render: (r) => rs(r.unrealizedProfit || 0)
          }
        ],
        data: stockItemsList || [],
        summaryRows: [
          { label: 'Total Stone Items', labelUrdu: 'کل آئٹمز تعداد', value: `${stockItemsList.length}` },
          { label: 'Total Inventory Sale Value', labelUrdu: 'کل اسٹاک سیل ویلیو', value: rs(summary.totalStockSaleValue) },
          { label: 'Total Purchase Cost Value', labelUrdu: 'کل خریداری لاگت', value: rs(summary.totalStockCostValue) },
          { label: 'Unrealized Inventory Profit', labelUrdu: 'تخمینہ منافع مارجن', value: rs(summary.unrealizedInventoryProfit) }
        ]
      };

    case 'RECEIVABLES':
      return {
        title: 'Customer Khata Receivables Audit Report (Udhaar)',
        titleUrdu: 'گاہک واجب الوصول ادھار کھاتہ آڈٹ رپورٹ',
        columns: [
          { key: 'name', label: 'Customer / Khata Name', labelUrdu: 'گاہک کا نام', bold: true, render: (r) => r.name || '-' },
          { key: 'phone', label: 'Phone', labelUrdu: 'فون نمبر', render: (r) => r.phone || '-' },
          { key: 'city', label: 'City', labelUrdu: 'شہر', render: (r) => r.city || '-' },
          {
            key: 'totalBilled',
            label: 'Total Billed',
            labelUrdu: 'کل بلنگ',
            align: 'right',
            render: (r) => rs(r.totalBilled || 0)
          },
          {
            key: 'totalPaid',
            label: 'Total Paid',
            labelUrdu: 'کل وصول شدہ',
            align: 'right',
            render: (r) => rs(r.totalPaid || 0)
          },
          {
            key: 'balanceDue',
            label: 'Receivable Due',
            labelUrdu: 'واجب الوصول بقایا',
            align: 'right',
            bold: true,
            render: (r) => rs(r.balanceDue || 0)
          }
        ],
        data: debtorCustomers || [],
        summaryRows: [
          { label: 'Indebted Customers Count', labelUrdu: 'ادھار کھاتہ دار تعداد', value: `${debtorCustomers.length}` },
          { label: 'Total Customer Receivables', labelUrdu: 'کل واجب الوصول ادھار', value: rs(summary.totalReceivables) }
        ]
      };

    case 'ADVANCES':
      return {
        title: 'Customer Advances & Undelivered Orders Report',
        titleUrdu: 'گاہک ایڈوانس و مال ڈیلیور ہونا باقی رپورٹ',
        columns: [
          { key: 'name', label: 'Customer Name', labelUrdu: 'گاہک کا نام', bold: true, render: (r) => r.name || '-' },
          { key: 'phone', label: 'Phone', labelUrdu: 'فون نمبر', render: (r) => r.phone || '-' },
          { key: 'city', label: 'City', labelUrdu: 'شہر', render: (r) => r.city || '-' },
          {
            key: 'advanceAmount',
            label: 'Advance Received',
            labelUrdu: 'موصولہ ایڈوانس',
            align: 'right',
            bold: true,
            render: (r) => rs(r.advanceAmount || 0)
          },
          { key: 'notes', label: 'Delivery Status / Note', labelUrdu: 'کیفیت / تفصیل', render: (r) => r.notes || 'Pending Delivery' }
        ],
        data: advanceCustomers || [],
        summaryRows: [
          { label: 'Advance Customers Count', labelUrdu: 'ایڈوانس کھاتہ دار', value: `${advanceCustomers.length}` },
          { label: 'Total Customer Advances (Deducted)', labelUrdu: 'کل ایڈوانس کٹوتی', value: rs(summary.totalCustomerAdvances) }
        ]
      };

    case 'PAYABLES':
      return {
        title: 'Supplier Dues & Payables Audit Report',
        titleUrdu: 'سپلائر واجب الادا رقم آڈٹ رپورٹ',
        columns: [
          { key: 'name', label: 'Supplier Name', labelUrdu: 'سپلائر کا نام', bold: true, render: (r) => r.name || '-' },
          { key: 'company', label: 'Company / Quarry', labelUrdu: 'مائن / کمپنی', render: (r) => r.company || '-' },
          { key: 'phone', label: 'Phone', labelUrdu: 'فون نمبر', render: (r) => r.phone || '-' },
          {
            key: 'totalPurchased',
            label: 'Total Purchased',
            labelUrdu: 'کل خریداری',
            align: 'right',
            render: (r) => rs(r.totalPurchased || 0)
          },
          {
            key: 'totalPaid',
            label: 'Total Paid',
            labelUrdu: 'کل ادائیگی',
            align: 'right',
            render: (r) => rs(r.totalPaid || 0)
          },
          {
            key: 'balancePayable',
            label: 'Balance Payable',
            labelUrdu: 'واجب الادا بقایا',
            align: 'right',
            bold: true,
            render: (r) => rs(r.balancePayable || 0)
          }
        ],
        data: supplierPayablesList || [],
        summaryRows: [
          { label: 'Suppliers with Dues', labelUrdu: 'سپلائرز تعداد', value: `${supplierPayablesList.length}` },
          { label: 'Total Supplier Payables (Deducted)', labelUrdu: 'کل واجب الادا رقم', value: rs(summary.totalSupplierPayables) }
        ]
      };

    case 'CASH':
      return {
        title: 'Live Cash in Hand & Drawer Reconciliation',
        titleUrdu: 'کیش ان ہینڈ و دراز گوشوارہ آڈٹ رپورٹ',
        columns: [
          { key: 'description', label: 'Cash Flow Head', labelUrdu: 'مد / تفصیل', bold: true, render: (r) => r.description || '-' },
          { key: 'flowType', label: 'Inflow / Outflow', labelUrdu: 'آمد / خرچ', align: 'center', render: (r) => r.flowType || '-' },
          {
            key: 'amount',
            label: 'Amount (Rs.)',
            labelUrdu: 'رقم (روپے)',
            align: 'right',
            bold: true,
            render: (r) => rs(r.amount || 0)
          }
        ],
        data: [
          { description: 'ابتدائی کیش دراز (Opening Cash in Drawer)', flowType: '(+) ابتدائی', amount: summary.openingCash || 0 },
          { description: 'نقد سیلز آمدن (Cash Sales Inflow Today)', flowType: '(+) آمد', amount: summary.cashSalesToday || 0 },
          { description: 'گاہک کھاتہ وصولی (Customer Khata Wasooli)', flowType: '(+) آمد', amount: summary.wasooliToday || 0 },
          { description: 'کارخانہ روزانہ اخراجات (Daily Factory Expenses)', flowType: '(-) خرچ', amount: summary.expensesToday || 0 },
          { description: 'موجودہ دراز نقد کیش (Live Cash in Drawer)', flowType: '(=) نقد بقایا', amount: summary.cashInHand || 0 }
        ],
        summaryRows: [
          { label: 'Net Live Cash in Drawer', labelUrdu: 'موجودہ دراز نقد رقم', value: rs(summary.cashInHand) }
        ]
      };

    default: // 'OVERVIEW'
      return {
        title: 'Executive Balance Sheet & Factory Net Worth Statement',
        titleUrdu: 'کارخانہ جامع بیلنس شیٹ و مالیاتی پوزیشن گوشوارہ',
        columns: [
          { key: 'head', label: 'Balance Sheet Component', labelUrdu: 'مالیاتی تفصیل / مد', bold: true, render: (r) => r.headUrdu || r.head || '-' },
          { key: 'formula', label: 'Formula Impact', labelUrdu: 'نوعیت اثر', align: 'center', render: (r) => r.formulaUrdu || r.formula || '-' },
          {
            key: 'amount',
            label: 'Amount (PKR)',
            labelUrdu: 'رقم (روپے)',
            align: 'right',
            bold: true,
            render: (r) => rs(r.amount || 0)
          },
          { key: 'notes', label: 'Financial Notes', labelUrdu: 'مالیاتی وضاحت و کیفیت', render: (r) => r.notesUrdu || r.notes || '-' }
        ],
        data: [
          {
            head: 'Stock Value at Sale Rate (اسٹاک سیل ویلیو)',
            headUrdu: '1. کارخانہ اسٹاک مالیت (سیل ریٹ پر)',
            formula: '(+) ASSET',
            formulaUrdu: '(+) اثاثہ',
            amount: summary.totalStockSaleValue,
            notes: 'Current yard inventory priced at full market selling rate',
            notesUrdu: 'فیکٹری یارڈ میں موجود تمام ماربل و ٹائلز اسٹاک کا کل سیل ریٹ پر تخمینہ'
          },
          {
            head: 'Cash in Hand / Drawer (کیش دراز میں رقم)',
            headUrdu: '2. کیش ان ہینڈ / دراز میں رقم',
            formula: '(+) ASSET',
            formulaUrdu: '(+) اثاثہ',
            amount: summary.cashInHand,
            notes: 'Liquid cash available immediately in factory drawer',
            notesUrdu: 'فیکٹری دراز اور کیش کاؤنٹر میں فوری دستیاب نقد رقم'
          },
          {
            head: 'Customer Receivables / Udhaar (گاہکوں سے وصول طلب ادھار)',
            headUrdu: '3. گاہکوں سے واجب الوصول ادھار کھاتہ',
            formula: '(+) ASSET',
            formulaUrdu: '(+) اثاثہ',
            amount: summary.totalReceivables,
            notes: 'Verified khata dues pending collection from customers',
            notesUrdu: 'تمام گاہکوں کے ذمہ ماربل و ٹائلز کی خریداری کا واجب الادا ادھار'
          },
          {
            head: 'Customer Advances Pending Delivery (ایڈوانس کٹوتی)',
            headUrdu: '4. گاہک ایڈوانس رقم (مال ڈیلیوری باقی)',
            formula: '(-) DEDUCTION',
            formulaUrdu: '(-) کٹوتی',
            amount: summary.totalCustomerAdvances,
            notes: 'Cash taken from customers for undelivered marble orders',
            notesUrdu: 'گاہکوں سے موصولہ ایڈوانس جن کا مال ابھی فیکٹری سے سپلائی نہیں ہوا'
          },
          {
            head: 'Supplier Payables (سپلائر کو واجب الادا رقم)',
            headUrdu: '5. سپلائر کو واجب الادا رقم (پتھر بلنگ)',
            formula: '(-) DEDUCTION',
            formulaUrdu: '(-) کٹوتی',
            amount: summary.totalSupplierPayables,
            notes: 'Outstanding khata dues owed to stone quarries & suppliers',
            notesUrdu: 'پتھر مائنز، ٹائلز کمپنیوں اور ٹرانسپورٹرز کے واجب الادا بقایا جات'
          },
          {
            head: 'NET FACTORY BUSINESS BALANCE (خالص مالیاتی توازن)',
            headUrdu: '★ خالص فیکٹری مالیاتی توازن (نیٹ ورتھ)',
            formula: '(=) NET WORTH',
            formulaUrdu: '(=) خالص توازن',
            amount: summary.netFactoryBalance,
            notes: 'Clean net worth based on client formula (Sale Basis)',
            notesUrdu: 'اسٹاک + دراز کیش + گاہک ادھار — ایڈوانس — سپلائر واجبات'
          }
        ],
        summaryRows: [
          { label: 'Total Current Assets', labelUrdu: 'کل تجارتی اثاثہ جات', value: rs(summary.totalAssetsSaleBasis), color: '#059669' },
          { label: 'Total Liabilities & Deductions', labelUrdu: 'کل واجبات و کٹوتیاں', value: rs(summary.totalLiabilities), color: '#dc2626' },
          { label: 'Net Business Balance (Sale Rate)', labelUrdu: 'خالص فیکٹری توازن (سیل ریٹ)', value: rs(summary.netFactoryBalance), color: '#059669' },
          { label: 'Net Business Balance (Cost Rate)', labelUrdu: 'خالص توازن (لاگت ریٹ)', value: rs(summary.netFactoryBalanceCostBasis) }
        ]
      };
  }
}

export default function BalanceSheetView({ settings: propSettings }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [horizon, setHorizon] = useState('Monthly');
  const [custom, setCustom] = useState({ from: todayStr(), to: todayStr() });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'STOCK' | 'RECEIVABLES' | 'ADVANCES' | 'PAYABLES' | 'CASH'

  const dbSettings = useLiveQuery(() => db.settings.toArray(), [])?.[0] || propSettings || {};

  // Reactive DB change listeners across all ERP modules
  const liveDbFingerprint = useLiveQuery(
    async () => {
      const [itms, custs, supps, invs, pays, exps, dayClosings] = await Promise.all([
        db.items.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.invoices.toArray(),
        db.customer_payments.toArray(),
        db.daily_expenses.toArray(),
        db.day_closings ? db.day_closings.toArray() : []
      ]);

      const stockHash = itms.reduce((acc, it) => acc + Number(it.stockSqFt || 0) + Number(it.stockPieces || 0) + Number(it.ratePerSqFt || 0), 0);
      const custDueHash = custs.reduce((acc, c) => acc + Number(c.balanceDue || 0), 0);
      const suppDueHash = supps.reduce((acc, s) => acc + Number(s.balancePayable || 0), 0);
      const invHash = invs.reduce((acc, inv) => acc + Number(inv.grandTotal || 0) + Number(inv.paidAmount || 0), 0);
      const payHash = pays.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const expHash = exps.reduce((acc, e) => acc + Number(e.amount || 0), 0);
      const dcHash = dayClosings.reduce((acc, d) => acc + Number(d.actualCash || 0), 0);

      return `${itms.length}_${stockHash}_${custDueHash}_${suppDueHash}_${invHash}_${payHash}_${expHash}_${dcHash}`;
    },
    []
  );

  useEffect(() => {
    loadReport();
  }, [horizon, custom.from, custom.to, liveDbFingerprint]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getComprehensiveBalanceSheet({ horizon, custom });
      setReport(data);
    } catch (err) {
      console.error('Error loading balance sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!report) return;
    const csv = exportBalanceSheetToCSV(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Marble-Factory-Balance-Sheet-${horizon.toLowerCase()}-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const json = exportBalanceSheetToJSON(report);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Marble-Factory-Balance-Sheet-${horizon.toLowerCase()}-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
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
          {tr('Compiling Factory Balance Sheet...', 'فیکٹری بیلنس شیٹ تیار ہو رہی ہے...')}
        </h3>
        <p style={{ fontSize: '0.84rem', margin: 0 }}>
          {tr('Evaluating Stock at sale rates, cash in drawer, customer khata & supplier payables', 'اسٹاک مارکیٹ ویلیو، دراز کیش، کسٹمر ادھار اور سپلائر حسابات کا تجزیہ')}
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const {
    summary = {},
    stockItemsList = [],
    stockCategoryBreakdown = [],
    debtorCustomers = [],
    advanceCustomers = [],
    supplierPayablesList = []
  } = report || {};

  const printConfig = getPrintConfig({
    activeTab,
    report,
    summary,
    stockCategoryBreakdown,
    stockItemsList,
    debtorCustomers,
    advanceCustomers,
    supplierPayablesList
  });

  return (
    <div
      className="balance-sheet-printable-area"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        maxWidth: '1440px',
        margin: '0 auto',
        paddingBottom: '30px'
      }}
    >
      {/* ── 1. SEAMLESS HERO HEADER (Consistent with other modules) ──────── */}
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
        {/* Left: Title + Subtitle */}
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
            <Scale size={15} />
            <span>{language === 'ur' ? 'مالیاتی توازن و اثاثہ جات' : 'Financial Equilibrium & Net Worth'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '13px',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                flexShrink: 0
              }}
            >
              <Scale size={24} />
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
                {language === 'ur' ? 'فیکٹری بیلنس شیٹ' : 'Factory Balance Sheet'}{' '}
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary, #64748b)',
                    fontFamily: 'var(--font-urdu, inherit)'
                  }}
                >
                  {language === 'ur' ? '' : '(مالیاتی توازن)'}
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
                  ? 'کارخانہ کے مجموعی اثاثہ جات، اسٹاک، دراز کیش، کسٹمر کھاتہ اور سپلائر واجبات کا جامع مالیاتی گوشوارہ'
                  : 'Comprehensive financial statement of inventory assets, cash reserves, customer khata and supplier liabilities'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
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
            <span>{tr('Print Sheet', 'پرنٹ بیلنس شیٹ')}</span>
          </button>
        </div>

        {/* Background Image with seamless gradient fade mask */}
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

      {/* ── 2. PRIMARY 4 KPI CARDS (Matching Dashboard layout) ─────────── */}
      <div className="kpi-card-grid">
        {/* KPI 1: STOCK VALUE (SALE RATE) */}
        <div className="kpi-metric-card interactive" onClick={() => setActiveTab('STOCK')} style={{ cursor: 'pointer' }}>
          <div className="kpi-metric-icon blue">
            <Boxes size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">{tr('Stock (Sale Rate)', 'اسٹاک سیل ویلیو')}</span>
              <span className="kpi-metric-label-ur">(اسٹاک سیل ویلیو)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#2563eb' }}>
              {rs(summary.totalStockSaleValue)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {summary.totalStockItemsCount} {tr('items in yard', 'آئٹمز برائے فروخت')}
            </div>
          </div>
        </div>

        {/* KPI 2: CASH IN HAND / DRAWER */}
        <div className="kpi-metric-card interactive" onClick={() => setActiveTab('CASH')} style={{ cursor: 'pointer' }}>
          <div className="kpi-metric-icon green">
            <Wallet size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">{tr('Cash in Drawer', 'کیش دراز میں رقم')}</span>
              <span className="kpi-metric-label-ur">(کیش دراز میں رقم)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#059669' }}>
              {rs(summary.cashInHand)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {tr('Live liquid cash balance', 'موجودہ دراز بیلنس')}
            </div>
          </div>
        </div>

        {/* KPI 3: CUSTOMER RECEIVABLES (UDHAAR) */}
        <div className="kpi-metric-card interactive" onClick={() => setActiveTab('RECEIVABLES')} style={{ cursor: 'pointer' }}>
          <div className="kpi-metric-icon indigo">
            <Users size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en">{tr('Customer Udhaar', 'گاہک ادھار')}</span>
              <span className="kpi-metric-label-ur">(گاہک واجب الوصول)</span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: '#4f46e5' }}>
              {rs(summary.totalReceivables)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {summary.debtorCustomersCount} {tr('khata accounts', 'ادھار کھاتہ دار')}
            </div>
          </div>
        </div>

        {/* KPI 4: NET FACTORY BALANCE (CLIENT'S FORMULA RESULT) */}
        <div
          className="kpi-metric-card interactive"
          onClick={() => setActiveTab('OVERVIEW')}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(16,185,129,0.06) 100%)',
            border: '2px solid rgba(16, 185, 129, 0.4)'
          }}
        >
          <div className="kpi-metric-icon" style={{ background: '#059669', color: '#fff' }}>
            <Scale size={22} />
          </div>
          <div className="kpi-metric-body">
            <div className="kpi-metric-label">
              <span className="kpi-metric-label-en" style={{ fontWeight: 800, color: '#059669' }}>
                {tr('Net Factory Balance', 'خالص فیکٹری توازن')}
              </span>
              <span className="kpi-metric-label-ur" style={{ fontWeight: 800, color: '#059669' }}>
                (خالص فیکٹری مالیاتی توازن)
              </span>
            </div>
            <div className="kpi-metric-value font-mono" style={{ color: summary.netFactoryBalance >= 0 ? '#059669' : '#dc2626' }}>
              {rs(summary.netFactoryBalance)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
              {tr('Net Balance (Sale Rate)', 'خالص مالیاتی توازن (سیل ریٹ)')}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. TIME HORIZON FILTER BAR (Daily, Weekly, Monthly, Quarterly, Half, Yearly, Custom) ── */}
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
              {tr('Sheet Horizon', 'مدت انتخاب')}:
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
              fontSize: '0.78rem',
              flexWrap: 'wrap',
              gap: '2px'
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
                    padding: '6px 12px',
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
            {tr('Verified Ledger Audit', 'مصدقہ لیجر آڈٹ')}
          </span>
        </div>
      </div>


      {/* ── 5. ASSET VS LIABILITY DUAL SUMMARY CARDS ────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Left: Total Current Assets Panel */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="dash-card-header">
            <h3 className="dash-card-title">
              <TrendingUp size={18} style={{ color: '#059669' }} />
              <span>{language === 'ur' ? 'کل کاروباری اثاثہ جات (Assets)' : 'Total Business Assets'}</span>
            </h3>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#059669',
                background: 'rgba(16,185,129,0.1)',
                padding: '3px 10px',
                borderRadius: '6px'
              }}
              className="font-mono"
            >
              {rs(summary.totalAssetsSaleBasis)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• {tr('Stone Inventory (Market Sale Rate)', 'ماربل و ٹائلز اسٹاک (سیل ریٹ)')}:</span>
              <strong className="font-mono" style={{ color: '#2563eb' }}>{rs(summary.totalStockSaleValue)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• {tr('Live Cash in Drawer / Hand', 'کیش دراز میں رقم')}:</span>
              <strong className="font-mono" style={{ color: '#059669' }}>{rs(summary.cashInHand)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• {tr('Customer Khata Receivables (Udhaar)', 'گاہک واجب الوصول ادھار')}:</span>
              <strong className="font-mono" style={{ color: '#4f46e5' }}>{rs(summary.totalReceivables)}</strong>
            </div>
          </div>
        </div>

        {/* Right: Total Current Liabilities Panel */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="dash-card-header">
            <h3 className="dash-card-title">
              <TrendingDown size={18} style={{ color: '#dc2626' }} />
              <span>{language === 'ur' ? 'کل واجبات و کٹوتیاں (Liabilities)' : 'Total Liabilities & Deductions'}</span>
            </h3>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#dc2626',
                background: 'rgba(220,38,38,0.1)',
                padding: '3px 10px',
                borderRadius: '6px'
              }}
              className="font-mono"
            >
              {rs(summary.totalLiabilities)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• {tr('Customer Advances (Delivery Pending)', 'گاہک ایڈوانس (مال ڈیلیور ہونا باقی)')}:</span>
              <strong className="font-mono" style={{ color: '#dc2626' }}>{rs(summary.totalCustomerAdvances)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• {tr('Supplier Payables (Stone Dues)', 'سپلائر واجب الادا رقم')}:</span>
              <strong className="font-mono" style={{ color: '#dc2626' }}>{rs(summary.totalSupplierPayables)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>• {tr('Solvency Coverage Ratio', 'اثاثہ جات تا واجبات تناسب')}:</span>
              <strong className="font-mono" style={{ color: '#059669' }}>{summary.solvencyRatio}x</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. INTERACTIVE EXPLORATION DRILLDOWN TABS ───────────────────── */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Modern Tab Navigation Headers */}
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
            { id: 'OVERVIEW', label: tr('Executive Summary', 'خلاصہ بیلنس شیٹ'), icon: Scale },
            { id: 'STOCK', label: tr('Stock Valuation', 'اسٹاک ویلیویشن'), icon: Boxes, count: stockItemsList.length },
            { id: 'RECEIVABLES', label: tr('Customer Udhaar', 'گاہک ادھار کھاتہ'), icon: Users, count: debtorCustomers.length },
            { id: 'ADVANCES', label: tr('Customer Advances', 'گاہک ایڈوانس کٹوتی'), icon: Package, count: advanceCustomers.length },
            { id: 'PAYABLES', label: tr('Supplier Payables', 'سپلائر واجب الادا'), icon: Truck, count: supplierPayablesList.length },
            { id: 'CASH', label: tr('Cash in Drawer', 'کیش دراز گوشوارہ'), icon: Wallet }
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
                  padding: '11px 16px',
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

        {/* ── TAB 1: EXECUTIVE SUMMARY TABLE ────────────────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>{tr('Balance Sheet Head', 'مالیاتی جزو')}</th>
                  <th style={{ ...TH, textAlign: 'center' }}>{tr('Impact', 'اثر')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Amount (PKR)', 'رقم (روپے)')}</th>
                  <th style={TH}>{tr('Accounting Notes & Basis', 'وضاحت و اصول')}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'rgba(37,99,235,0.03)' }}>
                  <td style={{ ...TD, fontWeight: 800, color: '#2563eb' }}>
                    1. {tr('Total Stock Value at Sale Rate', 'کل اسٹاک سیل ریٹ پر مالیت')}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>(+) ASSET</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                    {rs(summary.totalStockSaleValue)}
                  </td>
                  <td style={{ ...TD, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tr('Total selling price of all marble, granite, and tiles in factory yard', 'کارخانہ یارڈ میں موجود تمام پتھر و ٹائلز کی فروخت پر متوقع آمدن')}
                  </td>
                </tr>

                <tr>
                  <td style={{ ...TD, fontWeight: 800, color: '#059669' }}>
                    2. {tr('Cash in Hand / Drawer', 'کیش دراز میں رقم')}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: '#059669' }}>(+) ASSET</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>
                    {rs(summary.cashInHand)}
                  </td>
                  <td style={{ ...TD, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tr('Immediately available physical cash in factory drawer', 'فیکٹری دراز میں موجود فوری مائع رقم')}
                  </td>
                </tr>

                <tr style={{ background: 'rgba(79,70,229,0.03)' }}>
                  <td style={{ ...TD, fontWeight: 800, color: '#4f46e5' }}>
                    3. {tr('Customer Receivables (Udhaar Khata)', 'گاہکوں سے واجب الوصول ادھار')}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>(+) ASSET</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5' }}>
                    {rs(summary.totalReceivables)}
                  </td>
                  <td style={{ ...TD, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tr('Verified outstanding amounts owed by registered khata customers', 'رجسٹرڈ گاہکوں کے کھاتہ جات میں واجب الادا ادھار')}
                  </td>
                </tr>

                <tr style={{ background: 'rgba(220,38,38,0.03)' }}>
                  <td style={{ ...TD, fontWeight: 800, color: '#dc2626' }}>
                    4. {tr('Customer Advances (Delivery Pending)', 'گاہک ایڈوانس (مال ڈیلیور ہونا باقی)')}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>(-) DEDUCT</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>
                    - {rs(summary.totalCustomerAdvances)}
                  </td>
                  <td style={{ ...TD, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tr('Advance cash collected for marble orders not yet delivered to customer', 'گاہکوں سے موصولہ ایڈوانس رقم جن کا مال ابھی بھیجا جانا باقی ہے')}
                  </td>
                </tr>

                <tr style={{ background: 'rgba(220,38,38,0.03)' }}>
                  <td style={{ ...TD, fontWeight: 800, color: '#dc2626' }}>
                    5. {tr('Supplier Payables (Stone Dues)', 'سپلائر کو واجب الادا رقم')}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>(-) DEDUCT</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>
                    - {rs(summary.totalSupplierPayables)}
                  </td>
                  <td style={{ ...TD, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {tr('Money owed to stone suppliers and quarries for raw marble purchases', 'کانوں اور سپلائرز کو کچے مال و بلاکس کی خریداری کا واجب الادا بقایا')}
                  </td>
                </tr>

                {/* Net Formula Total Row */}
                <tr style={{ background: 'rgba(5,150,105,0.08)', borderTop: '2px solid #059669' }}>
                  <td style={{ ...TD, fontWeight: 900, fontSize: '0.95rem', color: '#059669' }}>
                    (=) {tr('NET FACTORY BUSINESS BALANCE', 'خالص فیکٹری مالیاتی توازن (نیٹ ورتھ)')}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', fontWeight: 900, color: '#059669' }}>(=) NET WORTH</td>
                  <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: '1.25rem', color: summary.netFactoryBalance >= 0 ? '#059669' : '#dc2626' }}>
                    {rs(summary.netFactoryBalance)}
                  </td>
                  <td style={{ ...TD, fontWeight: 700, color: '#059669' }}>
                    {tr('Client formula net worth (Stock + Cash + Udhaar - Advances - Payables)', 'تمام واجبات و ایڈوانس نکال کر کلین خالص کاروباری مالیات')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: STOCK VALUATION TABLE ──────────────────────────────── */}
        {activeTab === 'STOCK' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>{tr('Code', 'کوڈ')}</th>
                  <th style={TH}>{tr('Stone Name', 'ماربل / پتھر کا نام')}</th>
                  <th style={TH}>{tr('Category', 'کیٹگری')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Stock Qty', 'دستیاب مقدار')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Sale Rate', 'سیل ریٹ')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Total Sale Value', 'کل سیل ویلیو')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Cost Rate', 'خرید لاگت')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Total Cost (COGS)', 'کل لاگت')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Profit Margin', 'منافع مارجن')}</th>
                </tr>
              </thead>
              <tbody>
                {stockItemsList.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      {tr('No stock items recorded in database.', 'اسٹاک میں کوئی آئٹم موجود نہیں ہے۔')}
                    </td>
                  </tr>
                ) : (
                  stockItemsList.map((item, idx) => (
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
                          {item.code}
                        </span>
                      </td>
                      <td style={{ ...TD, fontWeight: 800, color: 'var(--text-primary)' }}>{item.name}</td>
                      <td style={{ ...TD, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.category}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        {Number(item.quantity || 0).toLocaleString()} {item.unit}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: '#2563eb' }}>
                        {rs(item.saleRate)}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {rs(item.saleValue)}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {rs(item.costRate)}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {rs(item.costValue)}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>
                        {rs(item.unrealizedProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 3: CUSTOMER RECEIVABLES (UDHAAR) ──────────────────────── */}
        {activeTab === 'RECEIVABLES' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>{tr('Customer / Khata Name', 'گاہک کا نام و کھاتہ')}</th>
                  <th style={TH}>{tr('Phone', 'فون نمبر')}</th>
                  <th style={TH}>{tr('City', 'شہر')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Total Billed', 'کل بلنگ')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Total Paid', 'کل وصول شدہ')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Balance Due (Udhaar)', 'واجب الوصول ادھار')}</th>
                </tr>
              </thead>
              <tbody>
                {debtorCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      {tr('All customer khata accounts are clear! No pending udhaar.', 'تمام گاہکوں کے کھاتے صاف ہیں! کوئی ادھار واجب الوصول نہیں ہے۔')}
                    </td>
                  </tr>
                ) : (
                  debtorCustomers.map((c, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '36px' }}>{idx + 1}</td>
                      <td style={{ ...TD, fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{c.phone}</td>
                      <td style={{ ...TD, color: 'var(--text-muted)' }}>{c.city}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>{rs(c.totalBilled)}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: '#059669' }}>{rs(c.totalPaid)}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5' }}>
                        {rs(c.balanceDue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 4: CUSTOMER ADVANCES PENDING DELIVERY ──────────────────── */}
        {activeTab === 'ADVANCES' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>{tr('Customer Name', 'گاہک کا نام')}</th>
                  <th style={TH}>{tr('Phone', 'فون نمبر')}</th>
                  <th style={TH}>{tr('City / Address', 'شہر')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Advance Amount Paid', 'موصولہ ایڈوانس رقم')}</th>
                  <th style={TH}>{tr('Delivery Status / Reason', 'ڈیلیوری کیفیت / تفصیل')}</th>
                </tr>
              </thead>
              <tbody>
                {advanceCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      {tr('No pending customer advance liabilities found.', 'کوئی ایڈوانس رقم واجب الادا نہیں ہے۔')}
                    </td>
                  </tr>
                ) : (
                  advanceCustomers.map((c, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '36px' }}>{idx + 1}</td>
                      <td style={{ ...TD, fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{c.phone}</td>
                      <td style={{ ...TD, color: 'var(--text-muted)' }}>{c.city}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>
                        {rs(c.advanceAmount)}
                      </td>
                      <td style={{ ...TD, fontSize: '0.8rem', color: '#b45309' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(217,119,6,0.1)', fontWeight: 600 }}>
                          {c.notes || tr('Pending Goods Delivery', 'مال ڈیلیور ہونا باقی')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 5: SUPPLIER PAYABLES TABLE ────────────────────────────── */}
        {activeTab === 'PAYABLES' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>{tr('Supplier / Quarry Name', 'سپلائر / مائن کا نام')}</th>
                  <th style={TH}>{tr('Company / Location', 'کمپنی / مقام')}</th>
                  <th style={TH}>{tr('Phone', 'فون نمبر')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Total Purchased', 'کل خریداری')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Total Paid', 'کل ادائیگی')}</th>
                  <th style={{ ...TH, textAlign: 'right' }}>{tr('Balance Payable', 'واجب الادا بقایا')}</th>
                </tr>
              </thead>
              <tbody>
                {supplierPayablesList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      {tr('All supplier accounts are fully settled! No pending payables.', 'تمام سپلائرز کے حسابات کلیئر ہیں! کوئی رقم واجب الادا نہیں ہے۔')}
                    </td>
                  </tr>
                ) : (
                  supplierPayablesList.map((s, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '36px' }}>{idx + 1}</td>
                      <td style={{ ...TD, fontWeight: 800, color: 'var(--text-primary)' }}>{s.name}</td>
                      <td style={{ ...TD, color: 'var(--text-muted)' }}>{s.company}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{s.phone}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace' }}>{rs(s.totalPurchased)}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', color: '#059669' }}>{rs(s.totalPaid)}</td>
                      <td style={{ ...TD, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>
                        {rs(s.balancePayable)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 6: CASH DRAWER & RECONCILIATION ────────────────────────── */}
        {activeTab === 'CASH' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  {tr('Live Cash in Drawer', 'موجودہ دراز کیش')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  {rs(summary.cashInHand)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Liquid asset included in balance sheet', 'بیلنس شیٹ میں شامل رقم')}
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
                  {tr('Opening Cash Balance', 'ابتدائی دراز بیلنس')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                  {rs(summary.openingCash)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Rolled over from day closing', 'گزشتہ دن کا بندش بیلنس')}
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
                  {tr('Today Cash Inflows', 'آج کی نقد آمدن')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                  {rs((summary.cashSalesToday || 0) + (summary.wasooliToday || 0))}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Spot cash sales + khata recoveries', 'نقد بلنگ و وصول شدہ ادھار')}
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
                  {tr('Today Factory Cash Expenses', 'آج کے نقد اخراجات')}
                </div>
                <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  {rs(summary.expensesToday)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tr('Fuel, mess, labor & factory vouchers', 'کارخانہ، ڈیزل و متفرق خرچ')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 7. EXPORT MODAL (CSV & JSON) ────────────────────────────────── */}
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
                {tr('Export Balance Sheet Reports', 'بیلنس شیٹ رپورٹ ایکسپورٹ')}
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
                    <span>{tr('Print / Save PDF Executive Balance Sheet', 'پی ڈی ایف ایگزیکٹو بیلنس شیٹ رپورٹ')}</span>
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
                  <div style={{ fontWeight: 800 }}>{tr('JSON Raw Dataset', 'JSON را ڈیٹا فائل')}</div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {tr('Complete nested aggregations & balance sheet structure', 'بیلنس شیٹ کا مکمل تکنیکی ڈیٹا')}
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

      {/* ── 8. UNIVERSAL REPORT PRINT MODAL (Dynamic per activeTab) ─────── */}
      <UniversalReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={printConfig.title}
        titleUrdu={printConfig.titleUrdu}
        subtitle={
          language === 'ur'
            ? `مدت گوشوارہ: ${horizon === 'Daily' ? 'آج' : horizon === 'Weekly' ? 'اس ہفتے' : horizon === 'Monthly' ? 'اس ماہ' : horizon === 'Quarterly' ? 'سہ ماہی' : horizon === 'Half-Yearly' ? 'شش ماہی' : horizon === 'Yearly' ? 'اس سال' : `مخصوص تاریخ (${custom.from} تا ${custom.to})`} | مصدقہ فیکٹری آڈٹ`
            : `Horizon: ${horizon} ${horizon === 'Custom' ? `(${custom.from} to ${custom.to})` : ''} | Verified Factory Audit`
        }
        factorySettings={dbSettings}
        kpis={[
          { label: 'Stock (Sale Rate)', labelUrdu: 'اسٹاک سیل ویلیو', value: rs(summary?.totalStockSaleValue), color: '#2563eb' },
          { label: 'Cash in Drawer', labelUrdu: 'کیش دراز میں رقم', value: rs(summary?.cashInHand), color: '#059669' },
          { label: 'Customer Udhaar', labelUrdu: 'گاہک واجب الوصول ادھار', value: rs(summary?.totalReceivables), color: '#4f46e5' },
          {
            label: 'Net Factory Balance',
            labelUrdu: 'خالص فیکٹری مالیاتی توازن',
            value: rs(summary?.netFactoryBalance),
            color: (summary?.netFactoryBalance || 0) >= 0 ? '#059669' : '#dc2626'
          }
        ]}
        columns={printConfig.columns}
        data={printConfig.data}
        summaryRows={printConfig.summaryRows}
      />
    </div>
  );
}


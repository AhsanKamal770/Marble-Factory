import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart3, Printer, Download, TrendingUp, TrendingDown,
  Wallet, Calendar, Filter, Users, Layers, Award,
  DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw,
  PieChart, SlidersHorizontal, CheckCircle2, FileSpreadsheet
} from 'lucide-react';
import { db } from '../../db/index';
import { useLanguage } from '../../context/LanguageContext';
import {
  getComprehensiveSalesReport,
  exportSalesReportToCSV,
  exportSalesReportToJSON,
  getHorizonDateRange
} from './salesReportsService';

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const HORIZONS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'];

export default function SalesReportsView() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [horizon, setHorizon] = useState('Monthly');
  const [custom, setCustom] = useState({ from: todayStr(), to: todayStr() });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'CATEGORIES' | 'SUTARS' | 'CUSTOMERS' | 'PRODUCTS'

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
    a.download = `Rana-Shahab-Sales-Report-${horizon.toLowerCase()}-${todayStr()}.csv`;
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
    a.download = `Rana-Shahab-Sales-Report-${horizon.toLowerCase()}-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  const TH = {
    padding: '10px 8px',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-muted)',
    background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
    textAlign: 'left'
  };

  const TD = {
    padding: '9px 8px',
    verticalAlign: 'middle',
    fontSize: '0.82rem',
    borderBottom: '1px solid var(--border-divider, rgba(0,0,0,0.05))'
  };

  if (!report && loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontWeight: 600 }}>{tr('Calculating Sales & P&L Analytics...', 'سیلز رپورٹس و منافع تجزیہ لوڈ ہو رہا ہے...')}</p>
      </div>
    );
  }

  const { summary, categoryBreakdown, sutarBreakdown, topCustomers, topProducts, timelineSeries } = report || {
    summary: {},
    categoryBreakdown: [],
    sutarBreakdown: [],
    topCustomers: [],
    topProducts: [],
    timelineSeries: []
  };

  return (
    <div className="sales-report-printable-area" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Dynamic Print Styles Fix */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .sales-report-printable-area, .sales-report-printable-area * { visibility: visible !important; }
          .sales-report-printable-area {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; padding: 10px !important; margin: 0 !important;
            background: #ffffff !important; color: #000000 !important;
          }
          .no-print { display: none !important; }
          h1, h2, h3, p, span, td, th, div {
            color: #000000 !important; background: transparent !important; box-shadow: none !important;
          }
          table { border: 1px solid #ccc !important; width: 100% !important; }
          th, td { border-bottom: 1px solid #ddd !important; }
        }
      `}</style>

      {/* ── HEADER & CONTROLS ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              {tr('Sales Reports & P&L Analytics', 'سیلز رپورٹس و منافع تجزیہ')}
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(37,99,235,0.1)',
              color: '#2563eb'
            }}>
              MOD-07
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {tr('Verified Dexie.js offline sales, stone inventory costs, and net profit margins', 'آف لائن مصدقہ سیلز، اسٹاک لاگت اور خالص منافع کا گوشوارہ')}
            {summary.invoicesCount > 0 && (
              <span style={{ marginLeft: '10px', opacity: 0.8 }}>
                · {summary.invoicesCount} {tr('bills processed', 'بلز پروسیس ہوئے')}
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0 14px', height: '38px',
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Download size={14} /> {tr('Export', 'ایکسپورٹ')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0 14px', height: '38px',
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Printer size={14} /> {tr('Print', 'پرنٹ')}
          </button>
        </div>
      </div>

      {/* ── TIME HORIZON BAR ────────────────────────────────────────────── */}
      <div className="no-print" style={{
        display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {tr('Horizon', 'مدت')}:
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '0 14px', height: '34px',
                background: horizon === h ? '#2563eb' : 'transparent',
                border: '1px solid ' + (horizon === h ? '#2563eb' : 'var(--border-color)'),
                borderRadius: 'var(--radius-md)',
                color: horizon === h ? '#ffffff' : 'var(--text-primary)',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {h === 'Daily' ? tr('Daily (آج)', 'روزانہ') :
               h === 'Weekly' ? tr('Weekly (ہفتہ وار)', 'ہفتہ وار') :
               h === 'Monthly' ? tr('Monthly (ماہانہ)', 'ماہانہ') :
               h === 'Yearly' ? tr('Yearly (سالانہ)', 'سالانہ') :
               tr('Custom (تاریخ انتخاب)', 'مخصوص تاریخ')}
            </button>
          ))}

          {horizon === 'Custom' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '6px' }}>
              <input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom({ ...custom, from: e.target.value })}
                style={{
                  height: '34px', padding: '0 10px', fontSize: '0.82rem',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tr('to', 'تا')}</span>
              <input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                style={{
                  height: '34px', padding: '0 10px', fontSize: '0.82rem',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {tr('Reporting Horizon', 'رپورٹ کی مدت')}: <strong style={{ color: 'var(--text-primary)' }}>{report?.label}</strong>
        </div>
      </div>

      {/* ── 4-CARD PRIMARY KPI STRIP ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        
        {/* Card 1: Gross Sales */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px', position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tr('Total Gross Sales', 'کل سیلز بلنگ')}
            </span>
            <BarChart3 size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {rs(summary.grossSales)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>{summary.invoicesCount} {tr('bills', 'بلز')}</span>
            <span>·</span>
            <span>{summary.totalSqFtSold} {tr('Sq. Ft.', 'مربع فٹ')}</span>
            {summary.salesGrowthPct !== 0 && (
              <span style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center',
                color: summary.salesGrowthPct > 0 ? '#10b981' : '#ef4444', fontWeight: 700
              }}>
                {summary.salesGrowthPct > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(summary.salesGrowthPct)}%
              </span>
            )}
          </div>
        </div>

        {/* Card 2: True Net Profit (خالص منافع) */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tr('Net Profit (خالص منافع)', 'خالص منافع (P&L)')}
            </span>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
            {rs(summary.netProfit)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {tr('Net Margin', 'خالص منافع کی شرح')}: <strong style={{ color: '#10b981' }}>{summary.netMarginPct}%</strong>
            <span style={{ margin: '0 6px' }}>·</span>
            <span>{tr('Gross Profit', 'خام منافع')}: {rs(summary.grossProfit)}</span>
          </div>
        </div>

        {/* Card 3: Recoveries & Cash Collected */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tr('Cash Collected (وصولی)', 'کل وصولی کیش و بینک')}
            </span>
            <Wallet size={18} style={{ color: '#0ea5e9' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {rs(summary.totalCashInflow)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            <span>{tr('On-Spot Cash', 'فوری نقد')}: {rs(summary.cashSalesDirect)}</span>
            <span style={{ margin: '0 4px' }}>+</span>
            <span>{tr('Wasooli', 'کھاتہ وصولی')}: {rs(summary.wasooliCollections)}</span>
          </div>
        </div>

        {/* Card 4: Factory Expenses */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tr('Daily Expenses (روزانہ خرچ)', 'فیکٹری کے کل اخراجات')}
            </span>
            <TrendingDown size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
            {rs(summary.factoryExpenses)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            <span>{tr('Returns', 'واپسی مال کٹوتی')}: {rs(summary.salesReturnsAmount)}</span>
            <span style={{ margin: '0 6px' }}>·</span>
            <span>{tr('Discounts', 'رعایت')}: {rs(summary.totalDiscount)}</span>
          </div>
        </div>

      </div>

      {/* ── SECONDARY STRIP: CASH VS CREDIT & COGS BREAKDOWN ────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        
        {/* Cash vs Credit Ratio Bar */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {tr('Cash vs Credit Ratio (نقد بمقابلہ ادھار)', 'نقد و ادھار تناسب')}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {summary.cashRatio}% {tr('Cash', 'نقد')} / {summary.creditRatio}% {tr('Credit', 'ادھار')}
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(239,68,68,0.25)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${summary.cashRatio}%`, background: '#10b981', transition: 'width 0.4s ease' }} />
            <div style={{ height: '100%', width: `${summary.creditRatio}%`, background: '#ef4444', transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.78rem' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>● {tr('Cash Billed', 'نقد سیل')}: {rs(summary.cashSalesDirect)}</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>● {tr('Credit Udhar', 'ادھار کھاتہ')}: {rs(summary.creditSalesDirect)}</span>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) & Margins Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '16px 18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {tr('Cost of Goods Sold (COGS - لاگت مال)', 'ماربل خریداری و فیکٹری لاگت')}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1' }}>
              {summary.grossMarginPct}% {tr('Gross Margin', 'خام مارجن')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {rs(summary.totalCOGS)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {tr('Net Sales', 'خالص سیلز')}: <strong>{rs(summary.netSales)}</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            {tr('Gross Profit', 'خام منافع')}: <strong style={{ color: '#10b981' }}>{rs(summary.grossProfit)}</strong>
            <span style={{ margin: '0 6px' }}>—</span>
            {tr('Expenses', 'اخراجات')}: <strong style={{ color: '#ef4444' }}>{rs(summary.factoryExpenses)}</strong>
            <span style={{ margin: '0 6px' }}>=</span>
            {tr('Net Profit', 'خالص منافع')}: <strong style={{ color: '#10b981' }}>{rs(summary.netProfit)}</strong>
          </div>
        </div>

      </div>

      {/* ── TIME-SERIES VISUAL TREND (PURE SVG DUAL-LINE CHART) ──────────── */}
      {timelineSeries.length > 1 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {tr('Sales vs Wasooli vs Expense Trajectory', 'سیلز بمقابلہ وصولی و خرچ کا رجحان')}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {tr('Periodic timeline distribution across current horizon', 'منتخب مدت کے دوران روزانہ و ماہانہ مالیات')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ color: '#2563eb' }}>● {tr('Sales', 'سیلز')}</span>
              <span style={{ color: '#10b981' }}>● {tr('Wasooli', 'وصولی')}</span>
              <span style={{ color: '#ef4444' }}>● {tr('Expenses', 'خرچ')}</span>
            </div>
          </div>

          {/* Simple Dynamic SVG Spark-area chart */}
          {(() => {
            const maxVal = Math.max(...timelineSeries.map(p => Math.max(p.sales, p.wasooli, p.expenses)), 1000);
            const w = 800;
            const h = 140;
            const step = w / Math.max(timelineSeries.length - 1, 1);

            const salesPoints = timelineSeries.map((p, i) => `${i * step},${h - (p.sales / maxVal) * (h - 20) - 10}`).join(' ');
            const wasooliPoints = timelineSeries.map((p, i) => `${i * step},${h - (p.wasooli / maxVal) * (h - 20) - 10}`).join(' ');
            const expPoints = timelineSeries.map((p, i) => `${i * step},${h - (p.expenses / maxVal) * (h - 20) - 10}`).join(' ');

            return (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '140px', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="0" y1="10" x2={w} y2="10" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.4" />
                  <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.4" />
                  <line x1="0" y1={h - 10} x2={w} y2={h - 10} stroke="var(--border-color)" opacity="0.8" />

                  {/* Polylines */}
                  <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={salesPoints} />
                  <polyline fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={wasooliPoints} />
                  <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" points={expPoints} />

                  {/* Data Points on Hover / Ends */}
                  {timelineSeries.map((p, i) => (
                    <circle key={i} cx={i * step} cy={h - (p.sales / maxVal) * (h - 20) - 10} r="3" fill="#2563eb" />
                  ))}
                </svg>
                {/* Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {timelineSeries.filter((_, idx) => idx % Math.ceil(timelineSeries.length / 7) === 0 || idx === timelineSeries.length - 1).map((p, idx) => (
                    <span key={idx}>{p.label}</span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── DETAILED EXPLORATION TABS ───────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden'
      }}>
        {/* Tab Headers */}
        <div style={{
          display: 'flex', gap: '2px', borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-primary)', padding: '6px 12px 0', flexWrap: 'wrap'
        }}>
          {[
            { id: 'OVERVIEW', label: tr('Category Performance', 'اقسام ماربل کارکردگی'), icon: Layers },
            { id: 'SUTARS', label: tr('Sutar Thickness Breakdown', 'سوتر موٹائی تجزیہ'), icon: SlidersHorizontal },
            { id: 'CUSTOMERS', label: tr('Top Customers Khata', 'نمبر ون گاہک کھاتہ'), icon: Users },
            { id: 'PRODUCTS', label: tr('Top Stone Items', 'نمبر ون پتھر و مصنوعات'), icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 16px', fontSize: '0.82rem', fontWeight: 600,
                  color: active ? '#2563eb' : 'var(--text-muted)',
                  borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                  background: active ? 'var(--bg-card)' : 'transparent',
                  borderTopLeftRadius: '6px', borderTopRightRadius: '6px',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content 1: Category Breakdown */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>{tr('Stone Category', 'ماربل / ٹائل قسم')}</th>
                  <th style={TH}>{tr('Revenue', 'سیلز رقم')}</th>
                  <th style={TH}>{tr('Sq. Ft. Sold', 'مربع فٹ')}</th>
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
                    <td colSpan={8} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      {tr('No category transactions found in this horizon.', 'اس مدت میں کوئی ریکارڈ موجود نہیں۔')}
                    </td>
                  </tr>
                ) : (
                  categoryBreakdown.map((cat, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cat.name}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {rs(cat.revenue)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {cat.sqFt.toLocaleString()} {tr('SqFt', 'فٹ')}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {rs(cat.avgRatePerSqFt)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {rs(cat.cogs)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                        {rs(cat.profit)}
                      </td>
                      <td style={{ ...TD }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                          background: 'rgba(16,185,129,0.1)', color: '#10b981'
                        }}>
                          {cat.marginPct}%
                        </span>
                      </td>
                      <td style={{ ...TD }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--border-color)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${cat.sharePct}%`, background: '#2563eb' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', width: '30px' }}>
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

        {/* Tab Content 2: Sutar Breakdown */}
        {activeTab === 'SUTARS' && (
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {tr(
                'Distribution of marble slabs sold across Rana Shahab standardized Sutar thickness categories:',
                'رانا شہاب فیکٹری کے معیار کے مطابق مختلف سوتر موٹائیوں میں سیلز کی تفصیل:'
              )}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {sutarBreakdown.map((s, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '16px 18px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {s.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', background: 'rgba(37,99,235,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {s.sharePct}% {tr('share', 'حصہ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                    {rs(s.revenue)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span>{tr('Sq. Ft.', 'رقبہ')}: <strong>{s.sqFt.toLocaleString()}</strong></span>
                    <span>{tr('Profit', 'منافع')}: <strong style={{ color: '#10b981' }}>{rs(s.profit)}</strong></span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '3px', background: 'var(--border-color)', marginTop: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.sharePct}%`, background: '#2563eb' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content 3: Top Customers */}
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
                  <th style={TH}>{tr('Total Sq. Ft.', 'کل رقبہ')}</th>
                  <th style={TH}>{tr('Current Balance Due', 'موجودہ بقایا ادھار')}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      {tr('No customer sales recorded in this horizon.', 'اس مدت میں کوئی ریکارڈ نہیں۔')}
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((cust, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '30px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cust.name}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {cust.phone}
                      </td>
                      <td style={{ ...TD, color: 'var(--text-muted)' }}>
                        {cust.city}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {rs(cust.revenue)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {cust.billsCount}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {cust.sqFt.toLocaleString()} {tr('SqFt', 'فٹ')}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: cust.balanceDue > 0 ? '#ef4444' : '#10b981' }}>
                        {rs(cust.balanceDue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab Content 4: Top Stone Items */}
        {activeTab === 'PRODUCTS' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>#</th>
                  <th style={TH}>{tr('Code', 'کوڈ')}</th>
                  <th style={TH}>{tr('Stone Name', 'ماربل / پتھر کا نام')}</th>
                  <th style={TH}>{tr('Category', 'کیٹگری')}</th>
                  <th style={TH}>{tr('Sq. Ft. Sold', 'مربع فٹ')}</th>
                  <th style={TH}>{tr('Revenue', 'سیلز رقم')}</th>
                  <th style={TH}>{tr('Est. Cost', 'خام لاگت')}</th>
                  <th style={TH}>{tr('Gross Profit', 'خام منافع')}</th>
                  <th style={TH}>{tr('Margin %', 'مارجن')}</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...TD, textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                      {tr('No product items sold in this horizon.', 'اس مدت میں کوئی ریکارڈ نہیں۔')}
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-muted)', width: '30px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {p.code}
                      </td>
                      <td style={{ ...TD, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {p.name}
                      </td>
                      <td style={{ ...TD, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {p.category}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace' }}>
                        {p.sqFt.toLocaleString()} {tr('SqFt', 'فٹ')}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {rs(p.revenue)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {rs(p.cogs)}
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                        {rs(p.profit)}
                      </td>
                      <td style={{ ...TD }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                          background: 'rgba(16,185,129,0.1)', color: '#10b981'
                        }}>
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
      </div>

      {/* ── EXPORT MODAL ─────────────────────────────────────────────────── */}
      {exportModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '440px',
            padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)' }}>
              {tr('Export Sales & P&L Report', 'سیلز و منافع رپورٹ ایکسپورٹ')}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              {tr('Download formatted sales audit file for spreadsheet or archival:', 'رپورٹ کو ایکسل یا ڈیٹا فائل کی صورت میں ڈاؤن لوڈ کریں:')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDownloadCSV}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                <FileSpreadsheet size={20} style={{ color: '#10b981' }} />
                <div>
                  <div>{tr('Export as Microsoft Excel / CSV', 'ایکسل یا سی ایس وی فائل')}</div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {tr('Includes UTF-8 BOM for Urdu font compatibility', 'اردو اور انگریزی کیلئے مکمل سپورٹ')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadJSON}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                <Download size={20} style={{ color: '#2563eb' }} />
                <div>
                  <div>{tr('Export as JSON Raw Data', 'جے سن را ڈیٹا فائل')}</div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {tr('Complete nested aggregations & metrics structure', 'تمام اینالیٹکس کا مکمل ڈیٹا')}
                  </span>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                style={{
                  padding: '8px 18px', borderRadius: 'var(--radius-md)',
                  background: 'transparent', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                {tr('Close', 'بند کریں')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

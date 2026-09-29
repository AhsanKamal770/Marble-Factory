import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart3, Printer, Download, X, TrendingUp, TrendingDown,
  Wallet, Calendar, Filter, Users, Layers, SlidersHorizontal, PackagePlus
} from 'lucide-react';
import { db } from '../db';
import { useLanguage } from '../context/LanguageContext';

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString();
const todayStr = () => new Date().toISOString().slice(0, 10);

const HORIZONS = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'];

function rangeFor(horizon, custom) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (horizon === 'Daily') {
    start.setHours(0, 0, 0, 0);
  } else if (horizon === 'Weekly') {
    const day = now.getDay();
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (horizon === 'Monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (horizon === 'Yearly') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    return {
      start: custom.from ? new Date(custom.from + 'T00:00:00') : new Date(0),
      end: custom.to ? new Date(custom.to + 'T23:59:59') : end
    };
  }
  return { start, end };
}

export default function SalesReportsView() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [horizon, setHorizon] = useState('Monthly');
  const [custom, setCustom] = useState({ from: todayStr(), to: todayStr() });
  const [exportOpen, setExportOpen] = useState(false);

  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const items = useLiveQuery(() => db.items.toArray(), []) || [];

  const { start, end } = rangeFor(horizon, custom);

  const filtered = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.filter((inv) => {
      if (!inv) return false;
      const dateVal = inv.createdAt || inv.date;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }, [invoices, start.getTime(), end.getTime()]);

  // ---------- Overview metrics ----------
  const totalSales = filtered.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
  const totalDiscount = filtered.reduce((s, i) => s + Number(i.discountAmount || 0), 0);
  const netRealized = totalSales - filtered.reduce((s, i) => s + Number(i.balanceDue || 0), 0);
  const cashSales = filtered
    .filter((i) => (i.paymentMethod || '').toLowerCase() !== 'credit' && Number(i.balanceDue || 0) === 0)
    .reduce((s, i) => s + Number(i.grandTotal || 0), 0);
  const creditSales = totalSales - cashSales;
  const cashPct = totalSales ? Math.round((cashSales / totalSales) * 100) : 0;

  // ---------- Category / Sutar breakdown ----------
  const catMap = {};
  const sutarMap = { 4: 0, 6: 0, 9: 0, 14: 0, 'Other': 0 };
  filtered.forEach((inv) => {
    (inv.items || []).forEach((it) => {
      const cat = it.category || 'Uncategorized';
      catMap[cat] = (catMap[cat] || 0) + Number(it.amount || 0);
      const s = [4, 6, 9, 14].includes(Number(it.thicknessSutar)) ? Number(it.thicknessSutar) : 'Other';
      sutarMap[s] += Number(it.amount || 0);
    });
  });
  const catRows = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const catTotal = catRows.reduce((s, [, v]) => s + v, 0) || 1;
  const sutarRows = Object.entries(sutarMap).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const sutarTotal = sutarRows.reduce((s, [, v]) => s + v, 0) || 1;

  // ---------- Top customers ----------
  const custMap = {};
  filtered.forEach((inv) => {
    const key = inv.customerName || tr('Walk-in Cash Sale', 'عام خریدار');
    custMap[key] = custMap[key] || { revenue: 0, bills: 0 };
    custMap[key].revenue += Number(inv.grandTotal || 0);
    custMap[key].bills += 1;
  });
  const topCustomers = Object.entries(custMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const handleExportCSV = () => {
    const rows = [['Invoice #', 'Date', 'Customer', 'Grand Total', 'Discount', 'Paid', 'Balance Due', 'Payment Method']];
    filtered.forEach((i) => {
      rows.push([i.invoiceNo, (i.createdAt || i.date || '').slice(0, 10), i.customerName, i.grandTotal, i.discountAmount || 0, i.paidAmount, i.balanceDue, i.paymentMethod || '']);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${horizon.toLowerCase()}-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${horizon.toLowerCase()}-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const TH = {
    padding: "11px 20px", fontSize: "0.7rem", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em",
    color: "var(--text-muted)", background: "var(--bg-primary)",
    borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap",
    textAlign: "left",
  };

  const TD = {
    padding: "16px 20px", verticalAlign: "middle",
    borderBottom: "1px solid var(--border-divider, rgba(0,0,0,0.05))",
  };

  return (
    <div className="sales-report-printable-area" style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Dynamic Print Styles Fix */}
      <style>{`
        @media print {
          /* App layout elements ko hide karein */
          body * {
            visibility: hidden !important;
          }
          /* Sirf sales report component ko printable banayein */
          .sales-report-printable-area, .sales-report-printable-area * {
            visibility: visible !important;
          }
          .sales-report-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          /* Extra Controls & Buttons hide karein */
          .no-print {
            display: none !important;
          }
          /* Border and Text Colors for Paper */
          h1, h2, h3, p, span, td, th, div {
            color: #000000 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          table {
            border: 1px solid #ccc !important;
            width: 100% !important;
          }
          th, td {
            border-bottom: 1px solid #ddd !important;
          }
        }
      `}</style>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: "22px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{
              fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)",
              letterSpacing: "-0.02em", lineHeight: 1, margin: 0,
            }}>
              {tr("Sales Analytics & Reports", "سیلز اینالیٹکس و رپورٹس")}
            </h1>
            <p style={{
              fontSize: "0.83rem", color: "var(--text-muted)", marginTop: "5px",
              fontWeight: 400, lineHeight: 1,
            }}>
              {tr("Track revenue, customer volume, and sales breakdown", "آمدنی، کسٹمر حجم اور سیلز کی تفصیلات دیکھیں")}
              {filtered.length > 0 && (
                <span style={{ marginLeft: "10px", color: "var(--text-muted)", opacity: 0.6 }}>
                  · {filtered.length} {tr("bills found", "بلز")}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── TOP CONTROLS ────────────────────────────────────────────────── */}
      <div className="no-print" style={{
        display: "flex", gap: "10px", alignItems: "center",
        marginBottom: "18px", flexWrap: "wrap", justifyContent: "space-between",
      }}>
        {/* Horizon Selector */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "0 14px", height: "38px",
                background: horizon === h ? "var(--accent-blue)" : "var(--bg-card)",
                border: "1px solid " + (horizon === h ? "var(--accent-blue)" : "var(--border-color)"),
                borderRadius: "var(--radius-md)",
                color: horizon === h ? "#fff" : "var(--text-primary)",
                fontSize: "0.83rem", fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tr(h, h)}
            </button>
          ))}

          {horizon === 'Custom' && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "6px" }}>
              <input
                type="date"
                value={custom.from}
                onChange={(e) => setCustom({ ...custom, from: e.target.value })}
                style={{
                  height: "38px", padding: "0 10px", fontSize: "0.83rem",
                  background: "var(--bg-card)", border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none"
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{tr('to', 'تا')}</span>
              <input
                type="date"
                value={custom.to}
                onChange={(e) => setCustom({ ...custom, to: e.target.value })}
                style={{
                  height: "38px", padding: "0 10px", fontSize: "0.83rem",
                  background: "var(--bg-card)", border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)", color: "var(--text-primary)", outline: "none"
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "0 14px", height: "38px",
              background: "var(--bg-card)", border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)",
              fontSize: "0.83rem", fontWeight: 500, cursor: "pointer"
            }}
          >
            <Download size={14} /> {tr('Export', 'ایکسپورٹ')}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "0 14px", height: "38px",
              background: "var(--bg-card)", border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)",
              fontSize: "0.83rem", fontWeight: 500, cursor: "pointer"
            }}
          >
            <Printer size={14} /> {tr('Print', 'پرنٹ')}
          </button>
        </div>
      </div>

      {/* Date Indicator Subtitle */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '16px' }}>
        {tr('Showing', 'دکھایا جا رہا ہے')}: <span style={{ color: "var(--text-primary)" }}>{start.toLocaleDateString()}</span> – <span style={{ color: "var(--text-primary)" }}>{end.toLocaleDateString()}</span>
      </div>

      {/* ── METRICS OVERVIEW CARDS ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Total Sales Volume */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)", padding: "16px 18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {tr('Total Sales Volume', 'کل سیلز')}
            </span>
            <BarChart3 size={16} className="no-print" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {rs(totalSales)}
          </div>
        </div>

        {/* Net Realized */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)", padding: "16px 18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {tr('Net Realized', 'خالص وصولی')}
            </span>
            <TrendingUp size={16} className="no-print" style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
            {rs(netRealized)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {tr('Total minus pending balance', 'کل مائنس بقایا جات')}
          </div>
        </div>

        {/* Total Discount */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)", padding: "16px 18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {tr('Discount Awarded', 'دی گئی رعایت')}
            </span>
            <TrendingDown size={16} className="no-print" style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {rs(totalDiscount)}
          </div>
        </div>

        {/* Cash vs Credit Ratio */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)", padding: "16px 18px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {tr('Cash Ratio', 'نقد کا تناسب')}
            </span>
            <Wallet size={16} className="no-print" style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {cashPct}% {tr('Cash', 'نقد')}
          </div>
          <div className="no-print" style={{ height: '5px', borderRadius: '4px', background: 'rgba(239,68,68,0.25)', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cashPct}%`, background: '#10b981' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {rs(cashSales)} {tr('cash', 'نقد')} · {rs(creditSales)} {tr('credit', 'ادھار')}
          </div>
        </div>

      </div>

      {/* ── BREAKDOWN SECTIONS (GRID) ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        
        {/* Sales by Category */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)", padding: "18px 20px"
        }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            {tr('Sales by Category', 'کیٹیگری کے مطابق سیلز')}
          </div>
          {catRows.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: "12px 0" }}>
              {tr('No sales recorded in this period.', 'اس مدت میں کوئی سیل ریکارڈ نہیں ہوئی۔')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {catRows.map(([cat, amt]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{cat}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: 'var(--text-primary)' }}>{rs(amt)}</span>
                  </div>
                  <div className="no-print" style={{ height: '5px', borderRadius: '4px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(amt / catTotal) * 100}%`, background: 'var(--accent-blue)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Sutar Thickness */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)", padding: "18px 20px"
        }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            {tr('Sales by Sutar Thickness', 'سوتر کے مطابق سیلز')}
          </div>
          {sutarRows.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: "12px 0" }}>
              {tr('No sales recorded in this period.', 'اس مدت میں کوئی سیل ریکارڈ نہیں ہوئی۔')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sutarRows.map(([s, amt]) => (
                <div key={s}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {s === 'Other' ? tr('Tiles & Accessories', 'ٹائلز و دیگر') : `${s} Sutar`}
                    </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: 'var(--text-primary)' }}>{rs(amt)}</span>
                  </div>
                  <div className="no-print" style={{ height: '5px', borderRadius: '4px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(amt / sutarTotal) * 100}%`, background: '#f59e0b' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── TOP CUSTOMERS TABLE ─────────────────────────────────────────── */}
      <div style={{
        background: "var(--bg-card)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)", overflow: "hidden",
      }}>
        <div style={{ padding: '16px 20px', borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: 'var(--text-primary)' }}>
            {tr('Top Customers', 'اعلیٰ گاہک')}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: "60px" }}>#</th>
                <th style={TH}>{tr('Customer Name', 'گاہک کا نام')}</th>
                <th style={{ ...TH, textAlign: "center" }}>{tr('Total Bills', 'کل بلز')}</th>
                <th style={{ ...TH, textAlign: "right" }}>{tr('Total Revenue', 'کل آمدنی')}</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    <Users size={28} className="no-print" style={{ opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
                    {tr('No sales recorded for this period.', 'اس مدت کے لیے کوئی ڈیٹا موجود نہیں ہے۔')}
                  </td>
                </tr>
              ) : (
                topCustomers.map((c, idx) => {
                  const isLast = idx === topCustomers.length - 1;
                  const rowTD = { ...TD, borderBottom: isLast ? "none" : TD.borderBottom };

                  return (
                    <tr key={c.name}>
                      <td style={{ ...rowTD, fontWeight: 600, color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {idx + 1}
                      </td>
                      <td style={{ ...rowTD, fontWeight: 700, color: "var(--text-primary)", fontSize: "0.88rem" }}>
                        {c.name}
                      </td>
                      <td style={{ ...rowTD, textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {c.bills}
                      </td>
                      <td style={{ ...rowTD, textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)", fontSize: "0.92rem" }}>
                        {rs(c.revenue)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EXPORT MODAL ────────────────────────────────────────────────── */}
      {exportOpen && (
        <div className="modal-overlay no-print">
          <div className="modal-card" style={{ maxWidth: '420px', width: "90vw" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                {tr('Export Sales Report', 'رپورٹ ایکسپورٹ کریں')}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExportOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {tr(`Exporting ${filtered.length} invoice records for range (${horizon}).`, `انطخاب شدہ (${horizon}) مدت کے ${filtered.length} بل ایکسپورٹ کیے جا رہے ہیں۔`)}
              </p>
              
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportCSV}
                style={{ width: "100%", justifyContent: "center", gap: "8px" }}
              >
                <Download size={15} /> {tr('Download CSV Spreadsheet', 'CSV شیٹ ڈاؤن لوڈ کریں')}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportJSON}
                style={{ width: "100%", justifyContent: "center", gap: "8px" }}
              >
                <Download size={15} /> {tr('Download JSON Data', 'JSON ڈیٹا ڈاؤن لوڈ کریں')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
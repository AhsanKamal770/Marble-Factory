import React, { useState, useRef } from 'react';
import {
  Printer,
  X,
  FileText,
  Receipt,
  Share2,
  Check,
  Building2,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Hash,
  Download
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { printElement } from '../utils/printHelper';

export default function UniversalReportPrintModal({
  isOpen,
  onClose,
  title = 'Audit Report',
  titleUrdu = 'آڈٹ رپورٹ',
  subtitle = '',
  kpis = [],
  columns = [],
  data = [],
  summaryRows = [],
  factorySettings,
  defaultFormat = 'a4'
}) {
  const { language } = useLanguage();
  const [printFormat, setPrintFormat] = useState(defaultFormat || 'a4');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);

  if (!isOpen) return null;

  // Urdu Date formatting
  const formatUrduDate = (dateVal) => {
    const d = new Date(dateVal || Date.now());
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const urduMonths = [
      'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
      'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
    ];
    const month = urduMonths[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const currentDateEn = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const currentDateUr = formatUrduDate(new Date());
  const currentTime = new Date().toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const companyNameEn = factorySettings?.companyNameEnglish || factorySettings?.companyName || 'Rana Abdullah Siddique Marble Factory';
  const companyNameUr = factorySettings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری';
  const companyTagline = factorySettings?.tagline || 'معیاری ماربل، گرینائٹ اور ٹائلز کا بااعتماد مرکز';
  const phone = factorySettings?.phone || '0321-6606645 | 0300-6664187';
  const address = factorySettings?.address || 'جھمرہ روڈ، بالمقابل پی ایس او پمپ، فیصل آباد';

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `${titleUrdu || title}`,
        format: printFormat,
        isExportPDF: false,
        dir: 'rtl'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `${titleUrdu || title}`,
        format: printFormat,
        isExportPDF: true,
        dir: 'rtl'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyWhatsApp = () => {
    const lines = [
      `*${companyNameUr}*`,
      `_${companyNameEn}_`,
      `---------------------------------`,
      `*📑 ${titleUrdu} (${title})*`,
      subtitle ? `*فلٹر/پیریڈ:* ${subtitle}` : null,
      `*تاریخ:* ${currentDateUr} (${currentDateEn} ${currentTime})`,
      `---------------------------------`,
      `*خلاصہ / SUMMARY:*`,
      ...kpis.map((k) => `• *${k.labelUrdu || k.label}:* ${k.value}`),
      `---------------------------------`,
      `*کل ریکارڈز:* ${data.length}`,
      ...summaryRows.map((sr) => `• *${sr.labelUrdu || sr.label}:* ${sr.value}`),
      `---------------------------------`,
      `شکریہ! رابطہ: ${phone}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <style>{`
        @media print {
          @page {
            size: ${printFormat === 'thermal' ? '80mm auto' : 'A4 portrait'} !important;
            margin: ${printFormat === 'thermal' ? '0mm' : '8mm'} !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-target, .print-target * {
            visibility: visible !important;
          }
          .print-target {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${printFormat === 'thermal' ? '78mm' : '100%'} !important;
            max-width: ${printFormat === 'thermal' ? '78mm' : '210mm'} !important;
            margin: 0 auto !important;
            padding: ${printFormat === 'thermal' ? '3mm 2mm' : '4mm'} !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-hide, .modal-header, .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="modal-card"
        style={{
          maxWidth: printFormat === 'a4' ? '920px' : '440px',
          width: '96%',
          maxHeight: '94vh',
          transition: 'max-width 0.2s ease',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Control Bar (English Buttons Only, Clean Alignment, Hidden on Print) */}
        <div
          className="modal-header print-hide"
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--bg-secondary, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={17} style={{ color: 'var(--accent-blue, #2563eb)' }} />
              <span>{title}</span>
            </span>

            {/* Print Format Switcher (English Only) */}
            <div style={{ display: 'flex', background: 'var(--bg-primary, #ffffff)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: printFormat === 'a4' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                  color: printFormat === 'a4' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={13} />
                <span>A4 Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: printFormat === 'thermal' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                  color: printFormat === 'thermal' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Receipt size={13} />
                <span>80mm Slip</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyWhatsApp}
              title="Copy WhatsApp Summary"
              style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              {copied ? <Check size={14} style={{ color: '#059669' }} /> : <Share2 size={14} />}
              <span>{copied ? 'Copied!' : 'WhatsApp'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportPDF}
              disabled={isPrinting}
              title="Save as PDF directly"
              style={{
                fontSize: '0.78rem',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                color: '#059669',
                borderColor: '#10b981',
                background: 'rgba(16, 185, 129, 0.08)'
              }}
            >
              <Download size={14} />
              <span>Save PDF</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              disabled={isPrinting}
              style={{
                fontSize: '0.78rem',
                padding: '6px 16px',
                background: 'var(--accent-blue, #2563eb)',
                borderColor: 'var(--accent-blue, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                color: '#ffffff'
              }}
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: '6px', color: 'var(--text-secondary)' }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Printable Scroll Container */}
        <div
          className="modal-body"
          style={{
            background: '#f1f5f9',
            padding: printFormat === 'a4' ? '18px' : '12px',
            overflowY: 'auto',
            flex: 1
          }}
        >
          <div ref={printRef} className="print-target">
            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* FORMAT 1: A4 DETAILED AUDIT SHEET (PURE URDU WITH BILINGUAL HEADER) */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {printFormat === 'a4' && (
              <div
                dir="rtl"
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  border: '1px solid #cbd5e1',
                  padding: '24px 28px',
                  fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", system-ui, sans-serif'
                }}
              >
                {/* 1. TOP HEADER BANNER (English Left, Urdu Right, Bismillah Center) */}
                <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.90rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '6px' }}>
                    بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                    {/* Right: Urdu Factory Name */}
                    <div style={{ textAlign: 'right', flex: 1 }}>
                      <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1.4 }}>
                        {companyNameUr}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                        {companyTagline}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                        تاریخ رپورٹ: <strong>{currentDateUr}</strong> ({currentDateEn})
                      </div>
                    </div>

                    {/* Center Icon Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 10px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
                        }}
                      >
                        <Building2 size={22} />
                      </div>
                    </div>

                    {/* Left: English Factory Name & Details */}
                    <div dir="ltr" style={{ textAlign: 'left', flex: 1 }}>
                      <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.2px' }}>
                        {companyNameEn}
                      </h1>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'system-ui, sans-serif' }}>
                        <MapPin size={12} style={{ color: '#2563eb' }} />
                        <span>{address}</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'system-ui, sans-serif' }}>
                        <Phone size={12} style={{ color: '#2563eb' }} />
                        <span>{phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Document Title Ribbon */}
                  <div
                    style={{
                      marginTop: '14px',
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                      color: '#ffffff',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={17} />
                      <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>{titleUrdu}</span>
                      <span style={{ fontSize: '0.85rem', opacity: 0.85, fontFamily: 'system-ui, sans-serif' }}>({title})</span>
                    </div>

                    {subtitle && (
                      <div style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.2)', padding: '3px 12px', borderRadius: '4px', fontWeight: 700 }}>
                        {subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. KPI METRICS CARDS (Pure Urdu Labels) */}
                {kpis.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
                      gap: '10px',
                      marginBottom: '16px'
                    }}
                  >
                    {kpis.map((kpi, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRight: `4px solid ${kpi.color || '#2563eb'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          textAlign: 'right'
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800 }}>
                          {kpi.labelUrdu || kpi.label}
                        </div>
                        <div style={{ fontSize: '1.10rem', fontWeight: 900, color: kpi.color || '#1e293b' }}>
                          {kpi.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. ITEM DATA TABLE (Pure Urdu Columns) */}
                <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.80rem',
                      color: '#0f172a'
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '40px', fontWeight: 800, color: '#1e3a8a' }}>#</th>
                        {columns.map((col, idx) => (
                          <th
                            key={idx}
                            style={{
                              padding: '8px 10px',
                              textAlign: col.align || 'right',
                              width: col.width || 'auto',
                              fontWeight: 800,
                              color: '#1e3a8a'
                            }}
                          >
                            <div>{col.labelUrdu || col.label}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length + 1} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            کوئی ریکارڈ موجود نہیں (No records found)
                          </td>
                        </tr>
                      ) : (
                        data.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={{
                              background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                              borderBottom: '1px solid #e2e8f0'
                            }}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                              {rIdx + 1}
                            </td>
                            {columns.map((col, cIdx) => {
                              const val = col.render ? col.render(row, rIdx) : row[col.key];
                              return (
                                <td
                                  key={cIdx}
                                  style={{
                                    padding: '8px 10px',
                                    textAlign: col.align || 'right',
                                    fontWeight: col.bold ? 800 : 500,
                                    color: col.color ? col.color(row) : 'inherit',
                                    whiteSpace: col.nowrap ? 'nowrap' : 'normal'
                                  }}
                                >
                                  {val !== undefined && val !== null ? val : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. SUMMARY ROWS / TOTALS */}
                {summaryRows.length > 0 && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginBottom: '20px'
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569' }}>
                      کل ریکارڈز: <span style={{ color: '#2563eb', fontWeight: 900 }}>{data.length}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {summaryRows.map((sr, idx) => (
                        <div key={idx} style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e293b' }}>
                          <span style={{ color: '#64748b' }}>{sr.labelUrdu || sr.label}: </span>
                          <span style={{ color: sr.color || '#2563eb', fontWeight: 900 }}>{sr.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. AUDIT SIGNATURES & FOOTER */}
                <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '18px' }}>
                    <div style={{ textAlign: 'center', width: '160px' }}>
                      <div style={{ borderBottom: '1px solid #94a3b8', height: '30px', marginBottom: '4px' }}></div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>تیار کنندہ (Prepared By)</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '160px' }}>
                      <div style={{ borderBottom: '1px solid #94a3b8', height: '30px', marginBottom: '4px' }}></div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>تصدیق کنندہ (Verified By)</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '180px' }}>
                      <div style={{ borderBottom: '1px solid #94a3b8', height: '30px', marginBottom: '4px' }}></div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e3a8a' }}>دستخط مجاز / مالک (Authorized Sign)</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <span>پرنٹ وقت: {currentDateUr} ({currentDateEn} {currentTime})</span>
                    <span>یہ کمپیوٹرائزڈ آڈٹ رپورٹ برائے فیکٹری ریکارڈ ہے۔ | Rana Abdullah Siddique Marble Factory ERP</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* FORMAT 2: 80MM THERMAL SLIP                                    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {printFormat === 'thermal' && (
              <div
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  borderRadius: '6px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  border: '1px dashed #94a3b8',
                  padding: '16px 14px',
                  maxWidth: '380px',
                  margin: '0 auto',
                  fontFamily: 'monospace, "Courier New", Courier, sans-serif'
                }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, marginBottom: '2px', fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif' }}>
                    {companyNameUr}
                  </div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 700 }}>
                    {companyNameEn}
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#333333' }}>
                    Ph: {phone}
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#333333' }}>
                    {address}
                  </div>
                  <div style={{ borderTop: '1px dashed #000000', margin: '8px 0' }}></div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif' }}>
                    {titleUrdu}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {title}
                  </div>
                  {subtitle && (
                    <div style={{ fontSize: '0.68rem', color: '#555555', marginTop: '2px' }}>
                      {subtitle}
                    </div>
                  )}
                  <div style={{ fontSize: '0.68rem', color: '#555555', marginTop: '2px' }}>
                    DATE: {currentDateEn} {currentTime}
                  </div>
                  <div style={{ borderTop: '1px dashed #000000', margin: '8px 0' }}></div>
                </div>

                {/* Key Metric Highlights */}
                {kpis.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, textDecoration: 'underline', marginBottom: '4px' }}>
                      خلاصہ / AUDIT HIGHLIGHTS:
                    </div>
                    {kpis.map((kpi, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '2px' }}>
                        <span>{kpi.labelUrdu || kpi.label}:</span>
                        <strong>{kpi.value}</strong>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px dashed #000000', margin: '8px 0' }}></div>
                  </div>
                )}

                {/* Items Compact List */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', fontWeight: 900, borderBottom: '1px solid #000000', paddingBottom: '3px', marginBottom: '4px' }}>
                    <span style={{ width: '45%' }}>ITEM / DESC</span>
                    <span style={{ width: '25%', textAlign: 'center' }}>QTY</span>
                    <span style={{ width: '30%', textAlign: 'right' }}>VAL / STATUS</span>
                  </div>
                  {data.slice(0, 30).map((row, idx) => {
                    const col1 = columns[0]?.render ? columns[0].render(row, idx) : row[columns[0]?.key];
                    const col2 = columns[1]?.render ? columns[1].render(row, idx) : row[columns[1]?.key];
                    const col3 = columns[2]?.render ? columns[2].render(row, idx) : row[columns[2]?.key];
                    const colLast = columns[columns.length - 1]?.render ? columns[columns.length - 1].render(row, idx) : row[columns[columns.length - 1]?.key];
                    return (
                      <div key={idx} style={{ fontSize: '0.68rem', marginBottom: '4px', borderBottom: '1px dotted #cccccc', paddingBottom: '2px' }}>
                        <div style={{ fontWeight: 700 }}>
                          {idx + 1}. {row.name || row.itemName || row.employeeName || row.recipientName || row.beneficiaryName || row.supplierName || col1 || '-'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#333333' }}>
                          <span>{row.category || row.type || row.role || col2 || ''}</span>
                          <span>{row.stockSqFt ? `${row.stockSqFt} sqft` : row.amount ? `Rs.${Number(row.amount).toLocaleString()}` : colLast || ''}</span>
                        </div>
                      </div>
                    );
                  })}
                  {data.length > 30 && (
                    <div style={{ fontSize: '0.66rem', textAlign: 'center', fontStyle: 'italic', margin: '4px 0' }}>
                      + {data.length - 30} more records (View full A4 for complete list)
                    </div>
                  )}
                  <div style={{ borderTop: '1px dashed #000000', margin: '8px 0' }}></div>
                </div>

                {/* Summary & Totals */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 900 }}>
                    <span>کل ریکارڈز / TOTAL RECORDS:</span>
                    <span>{data.length}</span>
                  </div>
                  {summaryRows.map((sr, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 900, marginTop: '2px' }}>
                      <span>{sr.labelUrdu || sr.label}:</span>
                      <span>{sr.value}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Stamp */}
                <div style={{ textAlign: 'center', fontSize: '0.66rem', color: '#444444', borderTop: '1px dashed #000000', paddingTop: '8px' }}>
                  <div>*** END OF AUDIT SLIP ***</div>
                  <div style={{ marginTop: '2px' }}>Rana Abdullah Siddique Marble Factory ERP</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

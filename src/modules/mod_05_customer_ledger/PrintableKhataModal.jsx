import React, { useRef, useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileText,
  Phone,
  MapPin,
  Download,
  Share2,
  CheckCircle2,
  CreditCard,
  Building,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { printElement } from '../../utils/printHelper';

export default function PrintableKhataModal({
  isOpen,
  onClose,
  customer,
  timeline = [],
  settings,
  defaultFormat = 'a4'
}) {
  const printRef = useRef(null);
  const [printFormat, setPrintFormat] = useState(defaultFormat || 'a4');
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !customer) return null;

  // Bilingual Factory Settings
  const companyNameEn = settings?.companyNameEnglish || settings?.companyName || 'Rana Abdullah Siddique Marble Factory';
  const companyNameUr = settings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری';
  const companyTagline = settings?.tagline || 'نام ہی کافی ہے • معیاری ماربل، گرینائٹ اور ٹائلز کا بااعتماد مرکز';
  const phonePrimary = settings?.phone || '0317-9784782';
  const phoneSecondary = settings?.phoneSecondary || '0300-7995171';
  const addressUrdu = settings?.addressUrdu || 'فیصل آباد روڈ، نزد پی ایس او پٹرول پمپ، جھمرہ سٹی';
  const addressEn = settings?.address || 'Faisalabad Road near PSO Petrol Pump, Jhumra City';

  const totalBilled = Number(customer.totalBilled || 0);
  const advanceBalance = Number(customer.advanceBalance || 0);
  const balanceDue = Number(customer.balanceDue || 0);

  // Compute actual payments from timeline (excluding advance adjustments)
  const actualPaid = useMemo(() => {
    const validPayments = (timeline || []).filter(
      (t) => t.type === 'PAYMENT' && !t.isAdvanceAdjustment
    );
    if (validPayments.length > 0) {
      return validPayments.reduce((sum, p) => sum + Number(p.amount || p.credit || 0), 0);
    }
    return Number(customer.totalPaid || 0);
  }, [timeline, customer.totalPaid]);

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

  // Compute Running Ledger with Running Balance
  const runningLedger = useMemo(() => {
    let balance = 0;
    // Sort chronological: oldest to newest
    const sorted = [...(timeline || [])].sort(
      (a, b) => new Date(a.sortDate || a.date).getTime() - new Date(b.sortDate || b.date).getTime()
    );

    return sorted.map((t, idx) => {
      const isInv = t.type === 'INVOICE';
      const debit = isInv ? Number(t.debit || t.amount || t.grandTotal || 0) : 0;
      const credit = !isInv && !t.isAdvanceAdjustment ? Number(t.credit || t.amount || 0) : 0;
      const isAdvAdj = Boolean(t.isAdvanceAdjustment);

      balance = balance + debit - credit;

      const d = new Date(t.sortDate || t.date || Date.now());
      const dateStr = isNaN(d.getTime())
        ? '—'
        : `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;

      let desc = '';
      if (isInv) {
        if (t.items && t.items.length > 0) {
          desc = t.items.map(it => {
            const nl = (it.name || '').toLowerCase();
            const cl = (it.category || '').toLowerCase();
            const ul = (it.unit || '').toLowerCase();
            const uName = ul.includes('meter') || cl.includes('tile') || nl.includes('tile') ? 'Meters' : (ul.includes('piece') || ul.includes('pcs') || cl.includes('accessori') || cl.includes('tukri') || cl.includes('kalm') ? 'Pcs' : (ul.includes('r.ft') || cl.includes('border') || cl.includes('patti') ? 'R.Ft.' : 'Sq.Ft'));
            const q = it.billedQuantity || it.meters || it.runningFeet || it.pieces || it.quantity || it.totalSqFt || 0;
            return `${it.name || 'آئٹم'}${q ? ` (${q} ${uName})` : ''}`;
          }).join('، ');
        } else {
          desc = 'ماربل و ٹائلز خریداری';
        }
      } else if (isAdvAdj) {
        desc = 'پیشگی ایڈوانس سے بل کٹوتی';
      } else {
        const rawNote = (t.notes || t.description || '').toLowerCase();
        if (t.isAdvance || rawNote.includes('advance') || rawNote.includes('پیشگی') || rawNote.includes('ایڈوانس')) {
          desc = 'پیشگی ایڈوانس وصولی';
        } else if (rawNote.includes('pos') || rawNote.includes('invoice') || rawNote.includes('collection')) {
          desc = 'بل ادائیگی کیش وصولی';
        } else if (t.notes || t.description) {
          desc = (t.notes || t.description)
            .replace(/Advance payment received on customer registration/gi, 'پیشگی ایڈوانس وصولی')
            .replace(/\(پیشگی ایڈوانس وصولی\)/gi, '')
            .replace(/POS Cash Collection for Invoice/gi, 'بل وصولی')
            .trim() || 'کیش وصولی';
        } else {
          desc = 'کیش وصولی (کھاتہ ادائیگی)';
        }
      }

      return {
        sr: idx + 1,
        date: dateStr,
        refNo: isInv
          ? (t.invoiceNo ? `Bill #${t.invoiceNo}` : 'Invoice')
          : (t.paymentNo ? `Rec #${t.paymentNo}` : (isAdvAdj ? 'Adv-Adj' : 'Payment')),
        description: desc,
        paymentMethod: t.paymentMethod || 'Cash',
        debit,
        credit,
        isAdvanceAdjustment: isAdvAdj,
        runningBalance: balance
      };
    });
  }, [timeline]);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `Khata_Statement_${customer.name || 'Customer'}_${printFormat}`,
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
        title: `Khata_Statement_${customer.name || 'Customer'}_${printFormat}`,
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
      `*${companyNameEn}*`,
      `---------------------------------`,
      `*کھاتہ و لین دین تفصیل (Customer Khata)*`,
      `*گاہک کا نام:* ${customer.name}`,
      customer.phone ? `*فون نمبر:* ${customer.phone}` : null,
      customer.city ? `*شہر:* ${customer.city}` : null,
      `*تاریخ:* ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      `---------------------------------`,
      `*کل خریداری (Billed):* Rs. ${totalBilled.toLocaleString()}`,
      `*کل وصولی (Received):* Rs. ${actualPaid.toLocaleString()}`,
      advanceBalance > 0 ? `*پیشگی ایڈوانس (Advance):* Rs. ${advanceBalance.toLocaleString()}` : null,
      `*موجودہ بقایا واجب الادا (Balance Due):* Rs. ${balanceDue.toLocaleString()}`,
      `---------------------------------`,
      `*حالیہ لین دین (Recent Transactions):*`,
      ...runningLedger.slice(-5).map(
        (r) => `${r.date} • ${r.refNo} | ${r.debit > 0 ? `بل: +Rs. ${r.debit.toLocaleString()}` : `وصولی: -Rs. ${r.credit.toLocaleString()}`} | بقایا: Rs. ${r.runningBalance.toLocaleString()}`
      ),
      `---------------------------------`,
      `شکریہ! رابطہ برائے تصدیق: ${phonePrimary} • ${phoneSecondary}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const statementDocNo = `KHT-${String(customer.id).padStart(4, '0')}-${new Date().getFullYear()}`;

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
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
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
            margin: ${printFormat === 'thermal' ? '0mm' : '6mm'} !important;
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
          .modal-overlay, .modal-card {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .print-hide, .modal-header, .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div
        className="modal-card print-hide"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: printFormat === 'a4' ? '920px' : '440px',
          maxHeight: '94vh',
          height: '92vh',
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'max-width 0.2s ease'
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary, #f8fafc)',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {/* Title & Format Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#2563eb' }} />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                Customer Khata Statement
              </h3>
            </div>

            {/* Format Toggle Buttons */}
            <div
              style={{
                display: 'inline-flex',
                background: '#e2e8f0',
                padding: '2px',
                borderRadius: '8px',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: printFormat === 'a4' ? '#2563eb' : 'transparent',
                  color: printFormat === 'a4' ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                A4 Statement Slip
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: printFormat === 'thermal' ? '#2563eb' : 'transparent',
                  color: printFormat === 'thermal' ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                80mm Thermal Slip
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                color: '#15803d',
                borderColor: '#86efac',
                background: '#f0fdf4',
                fontWeight: 700
              }}
            >
              {copied ? <CheckCircle2 size={14} /> : <Share2 size={14} />}
              <span>{copied ? 'Copied!' : 'WhatsApp'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isPrinting}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                color: '#2563eb',
                borderColor: '#93c5fd',
                background: '#eff6ff',
                fontWeight: 700
              }}
            >
              <Download size={14} />
              <span>Save PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Scroll Container */}
        <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', background: '#e2e8f0', display: 'flex', justifyContent: 'center' }}>
          {/* ================================================================= */}
          {/* OPTION 1: A4 EXECUTIVE KHATA STATEMENT (DEFAULT) */}
          {/* ================================================================= */}
          {printFormat === 'a4' ? (
            <div
              ref={printRef}
              className="print-target a4-document-preview"
              dir="rtl"
              style={{
                width: '100%',
                maxWidth: '820px',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden',
                fontFamily: 'var(--font-primary, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
                border: '1px solid #cbd5e1'
              }}
            >
              {/* 1. FACTORY ROYAL BLUE HEADER */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0b2e59 0%, #1e40af 100%)',
                  color: '#ffffff',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                  borderBottom: '3px solid #2563eb'
                }}
              >
                {/* Right: Urdu Branding */}
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 900,
                      color: '#ffffff',
                      lineHeight: 1.25,
                      fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif'
                    }}
                  >
                    {companyNameUr}
                  </div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: '#dbeafe',
                      fontWeight: 600,
                      lineHeight: 1.35,
                      fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif',
                      marginTop: '4px'
                    }}
                  >
                    {addressUrdu}
                  </div>
                </div>

                {/* Left: English Branding & Phone Numbers */}
                <div dir="ltr" style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                    {companyNameEn}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#93c5fd', fontWeight: 700, marginTop: '2px' }}>
                    Rana Abdullah: <span className="font-mono" style={{ color: '#ffffff' }}>{phonePrimary}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#93c5fd', fontWeight: 700 }}>
                    Factory Munshi: <span className="font-mono" style={{ color: '#ffffff' }}>{phoneSecondary}</span>
                  </div>
                </div>
              </div>

              {/* Document Body */}
              <div style={{ padding: '16px 20px' }}>
                {/* 2. SUB-HEADER METADATA ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px', marginBottom: '12px' }}>
                  {/* Left: Title Badge Card */}
                  <div
                    style={{
                      background: '#f0f7fe',
                      border: '1px solid #bce0fd',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: '#1e3a8a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.10rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1.2 }}>
                        کسٹمر کھاتہ و لین دین اسٹیٹمنٹ
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                        Customer Khata Ledger Statement • باضابطہ تصدیق شدہ کھاتہ
                      </div>
                    </div>
                  </div>

                  {/* Right: Date & Statement Ref Box */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '4px',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <strong style={{ color: '#475569' }}>اسٹیٹمنٹ نمبر:</strong>
                      <span className="font-mono" dir="ltr" style={{ fontWeight: 800, color: '#0f172a' }}>{statementDocNo}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <strong style={{ color: '#475569' }}>تاریخ جاری:</strong>
                      <span className="font-mono" dir="ltr" style={{ fontWeight: 700, color: '#0f172a' }}>{formatUrduDate(new Date())}</span>
                    </div>
                  </div>
                </div>

                {/* 3. CUSTOMER PROFILE & CONTACT CARD */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #bce0fd',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>گاہک کا نام: </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{customer.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>فون نمبر: </span>
                      <strong className="font-mono" style={{ color: '#1e3a8a' }}>{customer.phone || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>شہر / پتہ: </span>
                      <strong style={{ color: '#0f172a' }}>{customer.city ? `${customer.city}${customer.address ? ` • ${customer.address}` : ''}` : (customer.address || 'فیصل آباد / جھمرہ')}</strong>
                    </div>
                    {customer.cnic && (
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 700 }}>شناختی کارڈ: </span>
                        <strong className="font-mono">{customer.cnic}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. SUMMARY KPI CARDS ROW */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px',
                    marginBottom: '14px'
                  }}
                >
                  {/* Card 1: Total Billed */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 700 }}>کل خریداری (Billed)</div>
                    <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                      Rs. {totalBilled.toLocaleString()}
                    </div>
                  </div>

                  {/* Card 2: Total Received */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 700 }}>کل وصولی (Received)</div>
                    <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                      Rs. {actualPaid.toLocaleString()}
                    </div>
                  </div>

                  {/* Card 3: Available Advance */}
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.70rem', color: '#1d4ed8', fontWeight: 700 }}>پیشگی ایڈوانس (Advance)</div>
                    <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>
                      Rs. {advanceBalance.toLocaleString()}
                    </div>
                  </div>

                  {/* Card 4: Balance Due */}
                  <div
                    style={{
                      background: balanceDue > 0 ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${balanceDue > 0 ? '#fecaca' : '#bbf7d0'}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.70rem', color: balanceDue > 0 ? '#b91c1c' : '#15803d', fontWeight: 700 }}>
                      بقایا واجب الادا (Balance Due)
                    </div>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        color: balanceDue > 0 ? '#dc2626' : '#15803d',
                        marginTop: '2px'
                      }}
                    >
                      Rs. {balanceDue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 5. RUNNING LEDGER TABLE */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.82rem',
                    marginBottom: '14px',
                    border: '1.5px solid #0b2e59',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <thead>
                    <tr style={{ background: '#0b2e59', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <th style={{ width: '105px', minWidth: '100px', padding: '9px 6px', textAlign: 'center', border: '1px solid #0b2e59', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        تاریخ
                      </th>
                      <th style={{ padding: '9px 12px', textAlign: 'right', border: '1px solid #0b2e59', fontWeight: 800 }}>
                        تفصیل و دستاویز
                      </th>
                      <th style={{ width: '115px', minWidth: '110px', padding: '9px 6px', textAlign: 'center', border: '1px solid #0b2e59', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        بل کی رقم (ڈیبٹ)
                      </th>
                      <th style={{ width: '115px', minWidth: '110px', padding: '9px 6px', textAlign: 'center', border: '1px solid #0b2e59', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        وصولی (کریڈٹ)
                      </th>
                      <th style={{ width: '130px', minWidth: '125px', padding: '9px 6px', textAlign: 'center', border: '1px solid #0b2e59', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        بقایا بیلنس
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningLedger.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                          کوئی سابقہ ریکارڈ یا لین دین موجود نہیں ہے (No Khata Transactions Found)
                        </td>
                      </tr>
                    ) : (
                      runningLedger.map((row, idx) => (
                        <tr
                          key={idx}
                          style={{
                            background: idx % 2 === 1 ? '#f8fbff' : '#ffffff',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}
                        >
                          <td
                            className="font-mono"
                            dir="ltr"
                            style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              color: '#334155',
                              fontWeight: 700,
                              border: '1px solid #cbd5e1',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.date}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span
                                className="font-mono"
                                dir="ltr"
                                style={{
                                  fontWeight: 800,
                                  color: row.isInvoice ? '#991b1b' : '#15803d',
                                  background: row.isInvoice ? '#fee2e2' : '#dcfce7',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              >
                                {row.refNo}
                              </span>
                              {row.isAdvanceAdjustment && (
                                <span style={{ fontSize: '0.68rem', color: '#1d4ed8', fontWeight: 700, background: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                                  ایڈوانس کٹوتی
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px', lineHeight: 1.35 }}>
                              {row.description}
                            </div>
                          </td>
                          <td
                            className="font-mono"
                            style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: row.debit > 0 ? '#dc2626' : '#94a3b8',
                              border: '1px solid #cbd5e1',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.debit > 0 ? <span dir="ltr">Rs. {row.debit.toLocaleString()}</span> : '—'}
                          </td>
                          <td
                            className="font-mono"
                            style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: row.credit > 0 ? '#16a34a' : '#94a3b8',
                              border: '1px solid #cbd5e1',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.credit > 0 ? (
                              <span dir="ltr">Rs. {row.credit.toLocaleString()}</span>
                            ) : row.isAdvanceAdjustment ? (
                              <span dir="ltr" style={{ color: '#2563eb' }}>(Rs. {Number(row.credit || row.debit || 0).toLocaleString()})</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td
                            className="font-mono"
                            style={{
                              padding: '8px 6px',
                              textAlign: 'center',
                              fontWeight: 900,
                              border: '1px solid #cbd5e1',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.runningBalance > 0 ? (
                              <span style={{ color: '#dc2626' }}>
                                <span dir="ltr">Rs. {row.runningBalance.toLocaleString()}</span>{' '}
                                <span style={{ fontSize: '0.70rem', fontWeight: 700 }}>(بقایا)</span>
                              </span>
                            ) : row.runningBalance < 0 ? (
                              <span style={{ color: '#2563eb' }}>
                                <span dir="ltr">Rs. {Math.abs(row.runningBalance).toLocaleString()}</span>{' '}
                                <span style={{ fontSize: '0.70rem', fontWeight: 700 }}>(ایڈوانس)</span>
                              </span>
                            ) : (
                              <span style={{ color: '#16a34a' }}>
                                <span dir="ltr">Rs. 0</span>{' '}
                                <span style={{ fontSize: '0.70rem', fontWeight: 700 }}>(صاف)</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: '#eaf4fd',
                        borderTop: '2px solid #0b2e59',
                        fontWeight: 900,
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <td colSpan={2} style={{ padding: '9px 12px', textAlign: 'right', color: '#0b2e59', fontSize: '0.88rem', border: '1px solid #cbd5e1' }}>
                        میزان کل و حتمی بقایا:
                      </td>
                      <td className="font-mono" style={{ padding: '9px 6px', textAlign: 'center', color: '#dc2626', fontSize: '0.88rem', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                        <span dir="ltr">Rs. {totalBilled.toLocaleString()}</span>
                      </td>
                      <td className="font-mono" style={{ padding: '9px 6px', textAlign: 'center', color: '#16a34a', fontSize: '0.88rem', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                        <span dir="ltr">Rs. {actualPaid.toLocaleString()}</span>
                      </td>
                      <td className="font-mono" style={{ padding: '9px 6px', textAlign: 'center', fontSize: '0.88rem', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                        {balanceDue > 0 ? (
                          <span style={{ color: '#dc2626' }}>
                            <span dir="ltr">Rs. {balanceDue.toLocaleString()}</span> (بقایا)
                          </span>
                        ) : advanceBalance > 0 ? (
                          <span style={{ color: '#2563eb' }}>
                            <span dir="ltr">Rs. {advanceBalance.toLocaleString()}</span> (ایڈوانس)
                          </span>
                        ) : (
                          <span style={{ color: '#16a34a' }}>
                            <span dir="ltr">Rs. 0</span> (صاف)
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Final Account Position Card */}
                <div
                  style={{
                    marginTop: '12px',
                    marginBottom: '14px',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    border: balanceDue > 0 ? '1.5px solid #fca5a5' : (advanceBalance > 0 ? '1.5px solid #93c5fd' : '1.5px solid #86efac'),
                    background: balanceDue > 0 ? '#fef2f2' : (advanceBalance > 0 ? '#eff6ff' : '#f0fdf4'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 900, color: balanceDue > 0 ? '#991b1b' : (advanceBalance > 0 ? '#1e40af' : '#166534') }}>
                      {balanceDue > 0 ? (
                        <span>گاہک نے فیکٹری کو ادا کرنے ہیں (Net Payable):</span>
                      ) : advanceBalance > 0 ? (
                        <span>کسٹمر کا ایڈوانس زیادہ ہے، فیکٹری کے پاس جمع ہے (Advance Credit):</span>
                      ) : (
                        <span>کھاتہ مکمل بے باق اور صاف ہے (Account Cleared):</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      {balanceDue > 0
                        ? 'مندرجہ بالا کل بقایا واجب الادا رقم ہے جو گاہک کی طرف واجب الوصول ہے۔'
                        : advanceBalance > 0
                        ? 'یہ رقم کسٹمر کی طرف سے فیکٹری کو پیشگی جمع شدہ ہے اور آئندہ بلز میں ایڈجسٹ کی جائے گی۔'
                        : 'کسٹمر کا کوئی بقایا واجب الادا یا ایڈوانس نہیں ہے، کھاتہ مکمل بے باق ہے۔'}
                    </div>
                  </div>
                  <div
                    className="font-mono"
                    dir="ltr"
                    style={{
                      fontSize: '1.30rem',
                      fontWeight: 900,
                      color: balanceDue > 0 ? '#dc2626' : (advanceBalance > 0 ? '#2563eb' : '#16a34a'),
                      padding: '6px 16px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.12)'
                    }}
                  >
                    Rs. {(balanceDue > 0 ? balanceDue : (advanceBalance > 0 ? advanceBalance : 0)).toLocaleString()}
                  </div>
                </div>

                {/* 6. URDU CONDITIONS & LEGAL NOTES */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    fontSize: '0.76rem',
                    color: '#334155',
                    lineHeight: 1.5,
                    textAlign: 'right'
                  }}
                >
                  <div>
                    <strong>نوٹ برائے کسٹمر: </strong> براہ کرم تمام لین دین اور بلز کی تصدیق کر لیں۔ کسی بھی قسم کی غلطی یا اختلاف کی صورت میں 3 دن کے اندر فیکٹری آفس میں اصل رسید لے کر تشریف لائیں تاکہ کھاتہ فوری درست کیا جا سکے۔
                  </div>
                </div>

                {/* 7. DUAL SIGNATURE BOXES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '24px', paddingTop: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '36px' }} />
                    <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '4px', fontSize: '0.80rem', fontWeight: 800 }}>
                      دستخط کسٹمر / خریدار (Customer Signature)
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ height: '36px' }} />
                    <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '4px', fontSize: '0.80rem', fontWeight: 800 }}>
                      دستخط منشی / فیکٹری انتظامیہ (Munshi / Factory Signature)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================================================================= */
            /* OPTION 2: 80MM THERMAL SLIP FORMAT */
            /* ================================================================= */
            <div
              ref={printRef}
              className="thermal-receipt-preview"
              dir="rtl"
              style={{
                width: '100%',
                maxWidth: '340px',
                background: '#ffffff',
                color: '#000000',
                padding: '16px 14px',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: 1.4
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '15px', fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif', fontWeight: 900 }}>
                  {companyNameUr}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '2px' }}>
                  {companyNameEn}
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                  {addressEn}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                  Ph: {phonePrimary} • {phoneSecondary}
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 800, background: '#f1f5f9', padding: '2px 6px', display: 'inline-block', borderRadius: '4px' }}>
                  CUSTOMER KHATA STATEMENT (کھاتہ پرچی)
                </div>
              </div>

              {/* Customer Details */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Customer:</strong> {customer.name}</span>
                </div>
                {customer.phone && <div><strong>Phone:</strong> {customer.phone}</div>}
                {customer.city && <div><strong>City:</strong> {customer.city}</div>}
                <div><strong>Date:</strong> {new Date().toLocaleString()}</div>
              </div>

              {/* Summary Account Totals */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', marginBottom: '10px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Purchases / Billed:</span>
                  <strong>Rs. {totalBilled.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Total Wasooli / Paid:</span>
                  <strong>Rs. {actualPaid.toLocaleString()}</strong>
                </div>
                {advanceBalance > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                    <span>Available Advance:</span>
                    <strong>Rs. {advanceBalance.toLocaleString()}</strong>
                  </div>
                )}
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '4px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900, color: balanceDue > 0 ? '#dc2626' : '#059669' }}>
                  <span>Baqaya / Balance Due:</span>
                  <span>Rs. {balanceDue.toLocaleString()}</span>
                </div>
              </div>

              {/* Transactions Breakdown */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '11px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '4px' }}>
                  RECENT TRANSACTIONS (حالیہ لین دین):
                </div>
                {runningLedger.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '6px', color: '#64748b' }}>No transactions recorded</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {runningLedger.slice(-8).map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderBottom: '1px dotted #e2e8f0', paddingBottom: '2px' }}>
                        <span>{t.date} • {t.refNo}</span>
                        <strong style={{ color: t.debit > 0 ? '#dc2626' : '#059669' }}>
                          {t.debit > 0 ? `+Rs. ${t.debit.toLocaleString()}` : `-Rs. ${t.credit.toLocaleString()}`}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Urdu Note & Signatures */}
              <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', textAlign: 'center', fontSize: '10px' }}>
                <div style={{ fontFamily: 'var(--font-urdu)', fontSize: '11px', marginBottom: '12px' }}>
                  کسی بھی قسم کے اختلاف کی صورت میں فوری منشی سے رابطہ کریں۔
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '10px' }}>
                  <span style={{ borderTop: '1px solid #000', padding: '2px 10px' }}>Customer Sign</span>
                  <span style={{ borderTop: '1px solid #000', padding: '2px 10px' }}>Munshi / Factory Sign</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary, #f8fafc)',
            gap: '8px'
          }}
        >
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportPDF}
              disabled={isPrinting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#2563eb',
                borderColor: '#93c5fd',
                background: '#eff6ff',
                fontWeight: 700
              }}
            >
              <Download size={14} />
              <span>Save PDF ({printFormat.toUpperCase()})</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              disabled={isPrinting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <Printer size={15} />
              <span>Print {printFormat === 'a4' ? 'A4 Statement' : '80mm Slip'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

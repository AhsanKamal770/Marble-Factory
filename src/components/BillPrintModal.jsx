import React, { useState, useRef } from 'react';
import { Printer, X, FileText, Receipt, Share2, Check, User, MapPin, Phone, Download, Calendar, Truck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { printElement } from '../utils/printHelper';
import { formatPrintRow } from '../utils/printItemFormatter';

export default function BillPrintModal({
  isOpen,
  onClose,
  invoice,
  settings,
  customer
}) {
  const { language } = useLanguage();
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);

  const companyUrdu = settings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری';
  const companyEnglish = 'Rana Abdullah Siddique';
  const companyEnglishSub = 'Marble Factory';
  const factoryPhone = 'ph : +92 300 7995171';
  const factoryPhoneBottom = '0300-7995171';
  const factoryAddressUrdu = 'فیصل آباد روڈ، نزد پی ایس او پٹرول پمپ، جھمرہ سٹی';
  const factoryAddressEnglish = 'Faisalabad Road near PSO Petrol Pump, Jhumra City';

  if (!isOpen || !invoice) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `Bill_${invoice.invoiceNo || 'Invoice'}`,
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
        title: `Bill_${invoice.invoiceNo || 'Invoice'}`,
        format: printFormat,
        isExportPDF: true,
        dir: 'rtl'
      });
    } finally {
      setIsPrinting(false);
    }
  };

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

  const isPieceItem = (item) => {
    if (!item) return false;
    const catLower = (item.category || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    if (item.unit === 'Piece' || item.unit === 'Pieces') return true;
    if (catLower.includes('tile accessories') || catLower.includes('other accessories')) return true;
    if (item.category === 'Flower' || item.category === 'Panels') return true;
    if (nameLower.includes('gola') || nameLower.includes('spacer') || nameLower.includes('filling') || nameLower.includes('bond')) return true;
    if (nameLower.includes('sink') || nameLower.includes('basin') || nameLower.includes('bason') || nameLower.includes('seat') || nameLower.includes('combod') || nameLower.includes('commode')) return true;
    return false;
  };

  const formatItemDimension = (item) => {
    const catLower = (item.category || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    const isTileAcc = catLower.includes('tile accessories') || ((catLower.includes('tile') || catLower.includes('accessories')) && (nameLower.includes('gola') || nameLower.includes('spacer') || nameLower.includes('filling') || nameLower.includes('bond')));
    const isOtherAcc = catLower.includes('other accessories') || nameLower.includes('sink') || nameLower.includes('basin') || nameLower.includes('bason') || nameLower.includes('seat') || nameLower.includes('combod') || nameLower.includes('commode');
    const isTile = item.unit === 'Meter' || (catLower.includes('tile') && !catLower.includes('accessories') && !isTileAcc);
    const isRunning = item.unit === 'R.Ft.' || item.category === 'Border' || item.category === 'Kali Patti';
    const isGolaBox = item.unit === 'Box';
    const isGola = nameLower.includes('gola');
    const isPiece = item.unit === 'Piece' || item.unit === 'Pieces' || item.category === 'Flower' || item.category === 'Panels' || item.category === 'Accessories' || isTileAcc || isOtherAcc || isGola;

    if (isTile) {
      const m = item.meters || item.billedQuantity || item.totalSqFt || 0;
      return `${m} میٹر`;
    }
    if (isRunning) {
      const rft = item.runningFeet || item.billedQuantity || item.totalSqFt;
      return `${rft} رننگ فٹ (${item.thicknessSutar || 3}" چوڑائی)`;
    }
    if (isGolaBox) {
      const b = item.boxes || item.billedQuantity || item.pieces || 1;
      return `${b} بکس / ڈبہ`;
    }
    if (isPiece) {
      const p = item.pieces || item.billedQuantity || item.quantity || 1;
      return `${p} عدد`;
    }
    if (item.length && item.width) {
      const qtyPrefix = item.pieces && Number(item.pieces) > 1 ? `${item.pieces} × ` : (item.quantity && Number(item.quantity) > 1 ? `${item.quantity} × ` : '');
      const sqFtSuffix = item.totalSqFt ? ` = ${item.totalSqFt} فٹ` : '';
      return `${qtyPrefix}${item.length} × ${item.width}${sqFtSuffix}`;
    }
    if (item.dimensions) {
      return item.totalSqFt ? `${item.dimensions} = ${item.totalSqFt} فٹ` : item.dimensions;
    }
    if (item.totalSqFt) {
      return `${item.totalSqFt} فٹ`;
    }
    if (item.quantity || item.pieces) {
      return `${item.quantity || item.pieces} عدد`;
    }
    return '-';
  };

  const handleCopyWhatsApp = () => {
    const lines = [
      `*${companyUrdu}*`,
      `*${companyEnglish} - ${companyEnglishSub}*`,
      `_نام ہی کافی ہے_`,
      `---------------------------------`,
      `*بل نمبر / Bill #:* ${invoice.invoiceNo}`,
      `*خریدار / Customer:* ${invoice.customerName}`,
      invoice.customerPhone ? `*فون:* ${invoice.customerPhone}` : null,
      invoice.customerAddress ? `*مقام:* ${invoice.customerAddress}` : null,
      `*تاریخ:* ${formatUrduDate(invoice.date || invoice.createdAt)}`,
      `---------------------------------`,
      `*تفصیل اشیاء (ITEMS):*`,
      ...(invoice.items || []).map((it, idx) => {
        const row = formatPrintRow(it, idx);
        const sizePart = row.size !== '-' ? ` [${row.size}]` : '';
        const detPart = row.details !== '-' ? ` (${row.details})` : '';
        return `${idx + 1}. ${row.name}${sizePart}${detPart} - ${row.quantity} ${row.unit} @ Rs.${row.rate.toLocaleString()} = Rs.${row.amount.toLocaleString()}`;
      }),
      `---------------------------------`,
      `*سب ٹوٹل:* Rs. ${Number(invoice.subtotal || invoice.grandTotal || 0).toLocaleString()}`,
      invoice.carriageCharges > 0 ? `*کرایہ باربرداری:* +Rs. ${Number(invoice.carriageCharges).toLocaleString()}` : null,
      invoice.labourCharges > 0 ? `*مزدوری:* +Rs. ${Number(invoice.labourCharges).toLocaleString()}` : null,
      invoice.polishCharges > 0 ? `*پالش:* +Rs. ${Number(invoice.polishCharges).toLocaleString()}` : null,
      invoice.discountAmount > 0 ? `*رعایت:* -Rs. ${Number(invoice.discountAmount).toLocaleString()}` : null,
      `*گرینڈ ٹوٹل:* Rs. ${Number(invoice.grandTotal || 0).toLocaleString()}`,
      `*ادائیگی شدہ رقم:* Rs. ${Number(invoice.paidAmount || 0).toLocaleString()}`,
      `*باقی رقم:* Rs. ${Number(invoice.balanceDue || 0).toLocaleString()}`,
      `---------------------------------`,
      `شکریہ! رابطہ: ${factoryPhoneBottom} / ${factoryPhone}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const items = invoice.items || [];
  const minRows = 7;
  const fillerCount = Math.max(0, minRows - items.length);
  const fillerRows = Array.from({ length: fillerCount });

  // Real Customer Data
  const customerName = invoice.customerName || customer?.name || 'عام خریدار (Cash Customer)';
  const customerPhone = invoice.customerPhone || customer?.phone || customer?.contact || '—';
  const customerAddress = invoice.customerAddress || invoice.address || customer?.address || customer?.city || 'چک جھمرہ / فیصل آباد';
  const customerCity = invoice.city || customer?.city || 'فیصل آباد / جھمرہ';

  // Delivery & Location Details for Bill Print (Driver details belong strictly to Gate Pass)
  const deliverySite = invoice.destination || invoice.deliveryAddress || 'سائیٹ پر ڈلیوری / فیکٹری';
  const deliveryCarrier = invoice.carrier || 'Direct Factory Pickup';


  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          .print-hide, .modal-header, .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="modal-card"
        style={{
          maxWidth: printFormat === 'a4' ? '710px' : '440px',
          width: '100%',
          maxHeight: '94vh',
          transition: 'max-width 0.2s ease',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Control Bar (English Buttons Only, Clean Alignment, Hidden on Print) */}
        <div className="modal-header print-hide" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} style={{ color: 'var(--accent-blue, #2563eb)' }} />
              <span>Invoice Print Preview</span>
            </span>

            {/* Print Format Switcher (English Only) */}
            <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: printFormat === 'a4' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                  color: printFormat === 'a4' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                <FileText size={12} />
                <span>A4 Bill</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: printFormat === 'thermal' ? 'var(--accent-blue, #2563eb)' : 'transparent',
                  color: printFormat === 'thermal' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                <Receipt size={12} />
                <span>80mm Thermal</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyWhatsApp}
              title="Copy WhatsApp Summary"
              style={{ fontSize: '0.76rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
            >
              {copied ? <Check size={13} style={{ color: '#059669' }} /> : <Share2 size={13} />}
              <span>{copied ? 'Copied!' : 'WhatsApp'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportPDF}
              disabled={isPrinting}
              title="Save as PDF directly"
              style={{
                fontSize: '0.76rem',
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
                color: '#059669',
                borderColor: '#10b981',
                background: 'rgba(16, 185, 129, 0.08)'
              }}
            >
              <Download size={13} />
              <span>Save PDF</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              disabled={isPrinting}
              style={{ fontSize: '0.76rem', padding: '5px 14px', background: 'var(--accent-blue, #2563eb)', borderColor: 'var(--accent-blue, #2563eb)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#ffffff' }}
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 6px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Scroll Container */}
        <div className="modal-body" style={{ background: '#f8fafc', padding: '12px 14px', overflowY: 'auto', flex: 1 }}>
          <div ref={printRef} className="print-target">
            {/* ------------------------------------------------------------- */}
            {/* FORMAT 1: EXACT A4 URDU BILL TEMPLATE WITH BILINGUAL HEADER   */}
            {/* ------------------------------------------------------------- */}
            {printFormat === 'a4' && (
              <div
                dir="ltr"
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '10px',
                  boxShadow: '0 2px 14px rgba(11, 46, 89, 0.08)',
                  border: '1px solid #bce0fd',
                  fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", "Plus Jakarta Sans", sans-serif',
                  maxWidth: '760px',
                  margin: '0 auto',
                  overflow: 'hidden',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                {/* 1. TOP HEADER BAR (English Left, Urdu Right) */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    color: '#ffffff',
                    padding: '12px 18px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    direction: 'ltr',
                    gap: '16px',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {/* Left: English Factory Details (Prominent) */}
                  <div
                    dir="ltr"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      flex: 1.15
                    }}
                  >
                    {/* Line 1: Rana Abdullah Siddique (Bara & Prominent) */}
                    <div
                      style={{
                        fontSize: '1.45rem',
                        fontWeight: 900,
                        color: '#ffffff',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        letterSpacing: '-0.3px',
                        lineHeight: 1.15
                      }}
                    >
                      {companyEnglish}
                    </div>
                    {/* Line 2: Marble Factory */}
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        color: '#bfdbfe',
                        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        lineHeight: 1.25,
                        marginTop: '1px'
                      }}
                    >
                      {companyEnglishSub}
                    </div>
                    {/* Lines 3 & 4: Contact Numbers */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px',
                        marginTop: '3px',
                        fontSize: '0.74rem',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono), monospace'
                      }}
                    >
                      <div>
                        <span style={{ color: '#93c5fd', fontWeight: 600 }}>Rana Abdullah :</span> 0317-9784782
                      </div>
                      <div>
                        <span style={{ color: '#93c5fd', fontWeight: 600 }}>Factory no :</span> 0300-7995171
                      </div>
                    </div>
                  </div>



                  {/* Right: Urdu Factory Details */}
                  <div
                    dir="rtl"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textAlign: 'right',
                      flex: 1
                    }}
                  >
                    {/* Line 1: Urdu Name */}
                    <div
                      style={{
                        fontSize: '1.30rem',
                        fontWeight: 900,
                        color: '#ffffff',
                        lineHeight: 1.25,
                        letterSpacing: '0.01em',
                        fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif'
                      }}
                    >
                      {companyUrdu}
                    </div>
                    {/* Line 2: Slogan */}
                    <div
                      style={{
                        fontSize: '0.86rem',
                        color: '#fef08a',
                        fontWeight: 800,
                        lineHeight: 1.35,
                        fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif'
                      }}
                    >
                      نام ہی کافی ہے
                    </div>
                    {/* Line 3: Urdu Address */}
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: '#dbeafe',
                        fontWeight: 600,
                        lineHeight: 1.35,
                        fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif'
                      }}
                    >
                      {factoryAddressUrdu}
                    </div>
                  </div>
                </div>

                {/* Main Body Section */}
                <div style={{ padding: '10px 14px' }}>
                  {/* 2. SUB-HEADER CARDS ROW (Exact Gate Pass Layout Match) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px', marginBottom: '8px' }}>
                    {/* Left Card: بل / رسید */}
                    <div
                      style={{
                        background: '#eaf4fd',
                        border: '1px solid #bce0fd',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {/* Document Icon Box */}
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '6px',
                          background: '#1e3a8a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <FileText size={17} color="#ffffff" strokeWidth={2.4} />
                      </div>

                      {/* Title in Center / Left */}
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1.2 }}>
                          بل / رسید
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, marginTop: '1px' }}>
                          (کسٹمر کی خریداری کا باضابطہ بل)
                        </div>
                      </div>
                    </div>

                    {/* Right Card: بل نمبر اور تاریخ */}
                    <div
                      style={{
                        background: '#eaf4fd',
                        border: '1px solid #bce0fd',
                        borderRadius: '8px',
                        padding: '5px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {/* Calendar Icon on Left */}
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid #1e3a8a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1e3a8a',
                          flexShrink: 0
                        }}
                      >
                        <Calendar size={16} strokeWidth={2.4} />
                      </div>

                      {/* Info lines on Right */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            className="font-mono"
                            dir="ltr"
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 900,
                              color: '#1e3a8a',
                              letterSpacing: '0.02em'
                            }}
                          >
                            {invoice.invoiceNo || 'INV-2026-1252'}
                          </span>
                          <span dir="rtl" style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2563eb' }}>بل نمبر:</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #bce0fd', paddingTop: '2px' }}>
                          <span dir="rtl" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e3a8a' }}>
                            {formatUrduDate(invoice.date || invoice.createdAt)}
                          </span>
                          <span dir="rtl" style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2563eb' }}>تاریخ:</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. TWO INFORMATION CARDS (گاہک کی معلومات & ڈرائیور کی معلومات - Matches Gate Pass Exactly) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    {/* Left Card: گاہک کی معلومات */}
                    <div
                      style={{
                        background: '#f0f7fe',
                        border: '1px solid #bce0fd',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {/* Card Header with User Icon on Right */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1e3a8a' }}>
                          گاہک کی معلومات
                        </div>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#1e3a8a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}
                        >
                          <User size={12} color="#ffffff" strokeWidth={2.6} />
                        </div>
                      </div>

                      {/* Details List (Value on Left, Label on Right - Seedha text without bi-di inversion) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span dir="ltr" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', textAlign: 'left' }}>
                            {customerName}
                          </span>
                          <span dir="rtl" style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.68rem' }}>نام:</span>
                        </div>
                        <div style={{ height: '1px', background: '#d4e8fc' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span dir="ltr" style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.74rem', textAlign: 'left', maxWidth: '75%', lineHeight: 1.2 }}>
                            {customerAddress}
                          </span>
                          <span dir="rtl" style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.68rem' }}>پتہ:</span>
                        </div>
                        <div style={{ height: '1px', background: '#d4e8fc' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span dir="ltr" className="font-mono" style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.78rem', textAlign: 'left' }}>
                            {customerPhone}
                          </span>
                          <span dir="rtl" style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.68rem' }}>فون نمبر:</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Card: مقام و ترسیل کی تفصیل (Location & Delivery Info - No Driver on Bill) */}
                    <div
                      style={{
                        background: '#f0f7fe',
                        border: '1px solid #bce0fd',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {/* Card Header with MapPin Icon on Right */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1e3a8a' }}>
                          مقام و ترسیل کی تفصیل
                        </div>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#1e3a8a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}
                        >
                          <MapPin size={12} color="#ffffff" strokeWidth={2.6} />
                        </div>
                      </div>

                      {/* Details List (Value on Left, Label on Right) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span dir="ltr" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem', textAlign: 'left', maxWidth: '75%', lineHeight: 1.2 }}>
                            {deliverySite}
                          </span>
                          <span dir="rtl" style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.68rem' }}>مقام / سائیٹ:</span>
                        </div>
                        <div style={{ height: '1px', background: '#d4e8fc' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span dir="ltr" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem', textAlign: 'left' }}>
                            {customerCity}
                          </span>
                          <span dir="rtl" style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.68rem' }}>شہر / ضلع:</span>
                        </div>
                        <div style={{ height: '1px', background: '#d4e8fc' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span dir="ltr" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem', textAlign: 'left' }}>
                            {deliveryCarrier}
                          </span>
                          <span dir="rtl" style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.68rem' }}>بذریعہ:</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. ITEMS TABLE (Standard RTL) */}
                  <div
                    dir="rtl"
                    style={{
                      border: '1.5px solid #0b2e59',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.78rem'
                      }}
                    >
                    <thead>
                      <tr
                        style={{
                          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                          color: '#ffffff',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '40px', border: '1px solid #1e40af' }}>سیریل نمبر</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #1e40af' }}>کوالٹی / آئٹم</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '75px', border: '1px solid #1e40af' }}>سائز</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '95px', border: '1px solid #1e40af' }}>پیمائش / تفصیل</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '60px', border: '1px solid #1e40af' }}>تعداد</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '55px', border: '1px solid #1e40af' }}>یونٹ</th>
                        <th style={{ padding: '6px 6px', textAlign: 'center', width: '70px', border: '1px solid #1e40af' }}>ریٹ (روپے)</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '85px', border: '1px solid #1e40af' }}>کل رقم (روپے)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Actual Items with Alternating Zebra Shading */}
                      {items.map((item, idx) => {
                        const isOdd = idx % 2 === 1;
                        const rowBg = isOdd ? '#f1f5f9' : '#ffffff';
                        const row = formatPrintRow(item, idx);
                        return (
                          <tr
                            key={idx}
                            style={{
                              height: '28px',
                              background: rowBg,
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact'
                            }}
                          >
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 800, color: '#1e40af' }}>
                              {row.sr}
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.86rem', color: '#1e3a8a' }}>
                              {row.name}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                              {row.size}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700, color: '#1e40af' }}>
                              {row.details}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#1e3a8a' }}>
                              {row.quantity}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700, color: '#2563eb' }}>
                              {row.unit}
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#1e3a8a', fontWeight: 600 }}>
                              {row.rate.toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#1e3a8a' }}>
                              {row.amount.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Filler Rows */}
                      {fillerRows.map((_, fIdx) => {
                        const globalIdx = items.length + fIdx;
                        const isOdd = globalIdx % 2 === 1;
                        const rowBg = isOdd ? '#f1f5f9' : '#ffffff';
                        return (
                          <tr
                            key={`fill-${fIdx}`}
                            style={{
                              height: '25px',
                              background: rowBg,
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact'
                            }}
                          >
                            <td style={{ border: '1px solid #e2e8f0', textAlign: 'center' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>

                  {/* 5. TOTALS & NOTES SPLIT SECTION */}
                  <div
                    dir="rtl"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr',
                      gap: '10px',
                      marginBottom: '10px',
                      alignItems: 'start'
                    }}
                  >
                    {/* Notes Box */}
                    <div
                      style={{
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        background: '#eff6ff',
                        padding: '10px 12px',
                        fontSize: '0.74rem',
                        boxShadow: '0 1px 3px rgba(37,99,235,0.03)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1d4ed8', marginBottom: '5px', lineHeight: 1.3 }}>
                        شرائط و ضوابط:
                      </div>
                      <div
                        dir="rtl"
                        style={{
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          lineHeight: 1.75,
                          fontSize: '0.66rem',
                          color: '#1e3a8a',
                          fontWeight: 600
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '16px', padding: '0 5px', background: '#1e40af', color: '#ffffff', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 900, marginLeft: '3px', verticalAlign: 'middle', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>1</span>
                        ماربل قدرتی چیز ہے اسکے شیڈ کلر رنگ اور قدرتی نقائص کی کوئی گارنٹی نہیں۔
                        &nbsp;&nbsp;
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '16px', padding: '0 5px', background: '#1e40af', color: '#ffffff', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 900, marginLeft: '3px', marginRight: '4px', verticalAlign: 'middle', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>2</span>
                        مال وصول کرتے وقت چیک کر لیں بعد میں ادارہ ذمہ دار نہ ہو گا۔
                        &nbsp;&nbsp;
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '16px', padding: '0 5px', background: '#1e40af', color: '#ffffff', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 900, marginLeft: '3px', marginRight: '4px', verticalAlign: 'middle', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>3</span>
                        مال کے استعمال کے بعد کسی قسم کا کوئی کلیم نہیں ہوگا۔
                        &nbsp;&nbsp;
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '16px', padding: '0 5px', background: '#1e40af', color: '#ffffff', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 900, marginLeft: '3px', marginRight: '4px', verticalAlign: 'middle', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>4</span>
                        ٹوٹا ہوا مال سیمنٹ والا آؤٹ سائز کسی خاص کلر کا مال قابل واپسی نہ ہو گا۔
                        &nbsp;&nbsp;
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '16px', padding: '0 5px', background: '#1e40af', color: '#ffffff', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 900, marginLeft: '3px', marginRight: '4px', verticalAlign: 'middle', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>5</span>
                        فیکٹری کے باہر ٹوٹ پھوٹ کی کوئی ذمہ داری نہیں۔
                        &nbsp;&nbsp;
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '16px', padding: '0 5px', background: '#1e40af', color: '#ffffff', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 900, marginLeft: '3px', marginRight: '4px', verticalAlign: 'middle', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>6</span>
                        بوقت ضرورت مال میں فلنگ کی جا سکتی ہے۔
                        &nbsp;&nbsp;
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '16px', padding: '0 5px', background: '#1e40af', color: '#ffffff', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 900, marginLeft: '3px', marginRight: '4px', verticalAlign: 'middle', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>7</span>
                        بل ڈیلیوری چالان وصولی کے مطابق ہو گا نہ کے موقع پر ماربل کی پیمائش کے مطابق۔
                        {invoice.notes && (
                          <div style={{ marginTop: '6px', borderTop: '1px dashed #bfdbfe', paddingTop: '3px', color: '#0369a1', fontSize: '0.68rem' }}>
                            <strong>خصوصی ہدایات:</strong> {invoice.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial Calculations Box */}
                    <div
                      style={{
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        background: '#ffffff',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        fontSize: '0.8rem',
                        boxShadow: '0 1px 3px rgba(37,99,235,0.03)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {/* Subtotal */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px' }}>
                        <span style={{ fontWeight: 700, color: '#1e3a8a' }}>کل اشیاء (سب ٹوٹل):</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#1e3a8a' }}>
                          Rs. {Number(invoice.subtotal || invoice.grandTotal || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Extra charges */}
                      {Number(invoice.carriageCharges || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px', color: '#475569' }}>
                          <span>کرایہ باربرداری:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>+ Rs. {Number(invoice.carriageCharges).toLocaleString()}</span>
                        </div>
                      )}

                      {Number(invoice.labourCharges || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px', color: '#475569' }}>
                          <span>مزدوری و لوڈنگ:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>+ Rs. {Number(invoice.labourCharges).toLocaleString()}</span>
                        </div>
                      )}

                      {Number(invoice.polishCharges || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px', color: '#475569' }}>
                          <span>پالش و کٹائی:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>+ Rs. {Number(invoice.polishCharges).toLocaleString()}</span>
                        </div>
                      )}

                      {Number(invoice.discountAmount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px', color: '#dc2626' }}>
                          <span>خاص رعایت (ڈسکاؤنٹ):</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>- Rs. {Number(invoice.discountAmount).toLocaleString()}</span>
                        </div>
                      )}

                      {/* Grand Total Ribbon */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                          padding: '5px 8px',
                          borderRadius: '5px',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          margin: '1px 0',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <span style={{ fontSize: '0.92rem', color: '#ffffff' }}>کل رقم (گرینڈ ٹوٹل):</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.96rem', color: '#ffffff' }}>
                          Rs. {Number(invoice.grandTotal || 0).toLocaleString()}
                        </span>
                      </div>

                      {Number(invoice.appliedAdvance) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px', color: '#2563eb', fontWeight: 800 }}>
                          <span>ایڈوانس سے کٹوتی:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>
                            Rs. {Number(invoice.appliedAdvance).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {/* Paid Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px', color: '#16a34a', fontWeight: 800 }}>
                        <span>{Number(invoice.appliedAdvance) > 0 ? 'نقد وصولی:' : 'ادائیگی شدہ رقم:'}</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace' }}>
                          Rs. {Number(invoice.paidAmount || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Balance Due */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1px 3px',
                          color: Number(invoice.balanceDue) > 0 ? '#dc2626' : '#2563eb',
                          fontWeight: 800,
                          borderTop: '1px dashed #bfdbfe',
                          paddingTop: '2px'
                        }}
                      >
                        <span>باقی رقم:</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace' }}>
                          Rs. {Number(invoice.balanceDue || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6. SIGNATURES SECTION */}
                  <div
                    dir="rtl"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      paddingTop: '10px',
                      marginBottom: '6px'
                    }}
                  >
                    {/* Buyer Signature */}
                    <div style={{ textAlign: 'center', width: '160px', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                      <div style={{ borderBottom: '1.2px dashed #93c5fd', width: '100%', height: '8px' }} />
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.4 }}>خریدار کے دستخط</div>
                      <div style={{ fontSize: '0.68rem', color: '#2563eb', lineHeight: 1.3 }}>(گاہک)</div>
                    </div>

                    {/* Factory Signature */}
                    <div style={{ textAlign: 'center', width: '190px', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                      <div style={{ borderBottom: '1.2px dashed #93c5fd', width: '100%', height: '8px' }} />
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.4 }}>دستخط برائے {companyUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری'}</div>
                      <div style={{ fontSize: '0.68rem', color: '#2563eb', lineHeight: 1.3 }}>(مجاز نمائندہ)</div>
                    </div>
                  </div>
                </div>

                {/* 7. FOOTER BOTTOM BAR */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    color: '#ffffff',
                    padding: '7px 16px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.76rem',
                    direction: 'ltr',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {/* Left: Phone Number */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono), monospace', fontWeight: 700, color: '#ffffff' }}>
                    <Phone size={12} color="#93c5fd" />
                    <span>{factoryPhoneBottom}</span>
                  </div>

                  {/* Right: Factory Location */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#ffffff' }}>{factoryAddressEnglish}</span>
                    <MapPin size={13} color="#93c5fd" />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 2: 80MM THERMAL RECEIPT SLIP                           */}
            {/* ------------------------------------------------------------- */}
            {printFormat === 'thermal' && (
              <div
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  width: '76mm',
                  margin: '0 auto',
                  padding: '12px 10px',
                  fontFamily: 'Courier New, Courier, monospace',
                  fontSize: '11px',
                  lineHeight: 1.3,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  borderRadius: '4px'
                }}
              >
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 900, fontSize: '14px', fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif' }}>{companyUrdu}</div>
                  <div style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif', color: '#333' }}>نام ہی کافی ہے</div>
                  <div style={{ fontWeight: 900, fontSize: '12px', marginTop: '3px' }}>RANA ABDULLAH SIDDIQUE</div>
                  <div style={{ fontWeight: 800, fontSize: '10px' }}>MARBLE FACTORY</div>
                  <div style={{ fontSize: '9.5px', marginTop: '2px' }}>{factoryPhone}</div>
                  <div style={{ fontSize: '9px', marginTop: '1px' }}>{factoryAddressEnglish}</div>
                  <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 700 }}>
                    {invoice.invoiceNo}
                  </div>
                  <div style={{ fontSize: '9px' }}>{new Date(invoice.date || invoice.createdAt).toLocaleString()}</div>
                </div>

                <div style={{ fontSize: '10px', marginBottom: '6px' }}>
                  <div>Cust: <strong>{customerName}</strong></div>
                  {customerPhone !== '-' && <div>Ph: {customerPhone}</div>}
                  {customerAddress && <div>Loc: {customerAddress}</div>}
                  {invoice.carrier && <div>Via: {invoice.carrier}</div>}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px 0' }}>Item</th>
                      <th style={{ textAlign: 'center', padding: '2px 0' }}>Size</th>
                      <th style={{ textAlign: 'center', padding: '2px 0' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const row = formatPrintRow(it, idx);
                      return (
                        <tr key={idx}>
                          <td style={{ padding: '2px 0' }}>
                            {row.name} {row.details !== '-' && <span style={{ fontSize: '9px' }}>({row.details})</span>}
                          </td>
                          <td style={{ textAlign: 'center', padding: '2px 0' }}>{row.size}</td>
                          <td style={{ textAlign: 'center', padding: '2px 0' }}>{row.quantity} {row.unit}</td>
                          <td style={{ textAlign: 'right', padding: '2px 0' }}>{row.rate.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '2px 0' }}>{row.amount.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>Rs. {Number(invoice.subtotal).toLocaleString()}</span>
                  </div>
                  {Number(invoice.carriageCharges) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Carriage:</span>
                      <span>+Rs. {Number(invoice.carriageCharges).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(invoice.labourCharges) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Labour:</span>
                      <span>+Rs. {Number(invoice.labourCharges).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(invoice.discountAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Discount:</span>
                      <span>-Rs. {Number(invoice.discountAmount).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px', borderTop: '1px solid #000', paddingTop: '2px' }}>
                    <span>TOTAL:</span>
                    <span>Rs. {Number(invoice.grandTotal).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Paid (Cash):</span>
                    <span>Rs. {Number(invoice.paidAmount).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Balance Due:</span>
                    <span>Rs. {Number(invoice.balanceDue).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 700 }}>{factoryAddressEnglish}</div>
                  <div style={{ fontWeight: 800, marginTop: '2px' }}>Ph: {factoryPhoneBottom}</div>
                  <div style={{ marginTop: '4px' }}>شکریہ! برائے مہربانی رسید سنبھال کر رکھیں۔</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

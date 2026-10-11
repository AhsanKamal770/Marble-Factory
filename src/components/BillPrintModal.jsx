import React, { useState, useRef } from 'react';
import { Printer, X, FileText, Receipt, Share2, Check, User, MapPin, Phone, Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { printElement } from '../utils/printHelper';

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

  const formatItemDimension = (item) => {
    const isTile = item.unit === 'Meter' || (item.category && item.category.toLowerCase().includes('tile') && !item.category.toLowerCase().includes('accessories'));
    const isRunning = item.unit === 'R.Ft.' || item.category === 'Border' || item.category === 'Kali Patti';
    const isGolaBox = item.unit === 'Box';
    const isGola = (item.name && item.name.toLowerCase().includes('gola'));
    const isPiece = item.unit === 'Piece' || item.category === 'Flower' || item.category === 'Panels' || item.category === 'Accessories' || isGola;

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
      const p = item.pieces || item.billedQuantity || 1;
      return `${p} عدد (${item.selectedSizePreset || (isGola ? 'گولا' : 'پیس')})`;
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
      ...(invoice.items || []).map(
        (it, idx) =>
          `${idx + 1}. ${it.name} [${it.unit === 'R.Ft.' ? (it.thicknessSutar || 3) + ' انچ' : (it.thicknessSutar ? it.thicknessSutar + ' سوتر' : (it.selectedSizePreset || 'معیاری'))}] - ${formatItemDimension(it)} @ Rs.${it.ratePerSqFt || it.rate || 0} = Rs.${Number(it.amount || 0).toLocaleString()}`
      ),
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
  const customerCategory = invoice.customerCategory || invoice.customerType || customer?.category || '';
  const customerPhone = invoice.customerPhone || customer?.phone || customer?.contact || '-';
  const customerAddress = invoice.customerAddress || invoice.address || customer?.address || (invoice.carrier ? `بذریعہ: ${invoice.carrier}` : 'فیکٹری گیٹ ڈلیوری');
  const customerCity = invoice.city || customer?.city || '';


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
                dir="rtl"
                style={{
                  background: '#ffffff',
                  color: '#1e293b',
                  borderRadius: '6px',
                  boxShadow: '0 2px 14px rgba(37,99,235,0.06)',
                  border: '1px solid #bfdbfe',
                  fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif',
                  maxWidth: '700px',
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

                  {/* Center Geometric Logo / Divider */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      opacity: 0.9
                    }}
                  >
                    <svg width="34" height="26" viewBox="0 0 54 40" fill="none">
                      <polygon points="4,38 22,6 38,38" fill="#1d4ed8" />
                      <polygon points="18,38 34,2 50,38" fill="#38bdf8" opacity="0.95" />
                      <polygon points="14,38 26,14 40,38" fill="#93c5fd" opacity="0.85" />
                    </svg>
                    <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.25)', marginTop: '4px' }} />
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
                  {/* 2. INVOICE META & BILL TITLE ROW (Compact & Clean) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    {/* Bill Title & Document Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <FileText size={16} color="#2563eb" strokeWidth={2.2} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'right' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e40af', lineHeight: 1.2 }}>
                          بل / رسید
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.2 }}>
                          (کسٹمر کی خریداری کا بل)
                        </div>
                      </div>
                    </div>

                    {/* Invoice Number & Date Box */}
                    <div
                      style={{
                        background: '#f0f7ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        minWidth: '135px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        textAlign: 'right',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div style={{ fontSize: '0.62rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.1 }}>بل نمبر</div>
                      <div
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 900,
                          color: '#1e3a8a',
                          fontFamily: 'var(--font-mono), monospace',
                          letterSpacing: '0.02em',
                          lineHeight: 1.15
                        }}
                      >
                        {invoice.invoiceNo || 'INV-2026-1252'}
                      </div>
                      <div
                        style={{
                          borderTop: '1px dashed #bfdbfe',
                          marginTop: '2px',
                          paddingTop: '2px',
                          fontSize: '0.66rem',
                          color: '#1e40af',
                          fontWeight: 700,
                          lineHeight: 1.2
                        }}
                      >
                        تاریخ: {formatUrduDate(invoice.date || invoice.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* 3. CUSTOMER INFO CARD (Compact Spacing) */}
                  <div
                    style={{
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      background: '#f8fbff',
                      padding: '5px 10px',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    {/* Customer Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <User size={14} color="#2563eb" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.1 }}>گاہک کا نام</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>
                          {customerName} {customerCategory ? `(${customerCategory})` : ''}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.1 }}>فون نمبر</div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e40af', fontFamily: 'var(--font-mono), monospace', lineHeight: 1.15 }}>
                          {customerPhone}
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div style={{ width: '1px', height: '36px', background: '#bfdbfe' }} />

                    {/* Location & Delivery */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <MapPin size={14} color="#2563eb" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.1 }}>مقام / ڈلیوری ایڈریس</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>
                          {customerAddress}
                        </div>
                        {customerCity && (
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e40af', lineHeight: 1.2 }}>
                            {customerCity}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. ITEMS TABLE */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: '10px',
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
                        <th style={{ padding: '6px 6px', textAlign: 'center', width: '38px', border: '1px solid #1e40af' }}>نمبر</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #1e40af' }}>تفصیل</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '55px', border: '1px solid #1e40af' }}>سائز</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '45px', border: '1px solid #1e40af' }}>انچ</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '55px', border: '1px solid #1e40af' }}>موٹائی</th>
                        <th style={{ padding: '6px 6px', textAlign: 'center', width: '120px', border: '1px solid #1e40af' }}>فٹ / نیٹ (ضرب)</th>
                        <th style={{ padding: '6px 6px', textAlign: 'center', width: '70px', border: '1px solid #1e40af' }}>ریٹ (Rs.)</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', width: '85px', border: '1px solid #1e40af' }}>قیمت (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Actual Items with Alternating Zebra Shading */}
                      {items.map((item, idx) => {
                        const isOdd = idx % 2 === 1;
                        const rowBg = isOdd ? '#f1f5f9' : '#ffffff';
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
                            <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 800, color: '#1e40af' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.86rem', color: '#1e3a8a' }}>
                              {item.name}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#475569' }}>
                              {item.length ? `${item.length} ft` : (item.size || '-')}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#475569' }}>
                              {item.width ? `${item.width} in/ft` : (item.inch || item.inches || '-')}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700, color: '#1e40af' }}>
                              {item.thicknessSutar ? `${item.thicknessSutar} سوتر` : (item.thickness ? `${item.thickness}` : '6 سوتر')}
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 700, color: '#1e3a8a', fontSize: '0.76rem' }}>
                              {formatItemDimension(item)}
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#1e3a8a' }}>
                              {Number(item.ratePerSqFt || item.rate || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#1e3a8a' }}>
                              {Number(item.amount || (item.totalSqFt * item.ratePerSqFt) || 0).toLocaleString()}
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

                  {/* 5. TOTALS & NOTES SPLIT SECTION */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '10px', alignItems: 'start' }}>
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
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '4px', lineHeight: 1.4 }}>
                        نوٹ:
                      </div>
                      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1e3a8a', lineHeight: 1.55 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <span style={{ fontWeight: 800, minWidth: '16px' }}>1-</span>
                          <span>خریداری کے بعد مال واپس یا تبدیل نہیں کیا جا سکتا۔</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <span style={{ fontWeight: 800, minWidth: '16px' }}>2-</span>
                          <span>بل کی ادائیگی 7 دن کے اندر لازمی ہے۔</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <span style={{ fontWeight: 800, minWidth: '16px' }}>3-</span>
                          <span>معیار میں کسی قسم کی خرابی کی صورت میں فوری اطلاع دیں۔</span>
                        </div>
                        {invoice.notes && (
                          <div style={{ marginTop: '4px', borderTop: '1px dashed #bfdbfe', paddingTop: '3px', color: '#0369a1' }}>
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

                      {/* Paid Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 3px', color: '#16a34a', fontWeight: 800 }}>
                        <span>ادائیگی شدہ رقم:</span>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '10px', marginBottom: '6px' }}>
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
                      <th style={{ textAlign: 'center', padding: '2px 0' }}>Dim</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '2px 0' }}>
                          {it.name} <span style={{ fontSize: '9px' }}>({it.thicknessSutar || 6}S)</span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '2px 0' }}>{it.totalSqFt || it.dimensions || it.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{it.ratePerSqFt || it.rate}</td>
                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{Number(it.amount).toLocaleString()}</td>
                      </tr>
                    ))}
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

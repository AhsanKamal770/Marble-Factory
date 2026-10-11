import React, { useState, useRef } from 'react';
import {
  Printer,
  X,
  FileText,
  Receipt,
  Share2,
  Check,
  User,
  MapPin,
  Phone,
  Download,
  TrendingUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { printElement } from '../utils/printHelper';

export default function BillProfitPrintModal({
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
  const companyEnglish = settings?.companyNameEnglish || settings?.companyName || 'Rana Abdullah Siddique Marble Factory';
  const factoryPhone = settings?.phone || '0321-6606645 | 0300-6664187';
  const factoryAddress = settings?.address || 'جھمرہ روڈ، بالمقابل پی ایس او پمپ، فیصل آباد';

  if (!isOpen || !invoice) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `Profit_Report_${invoice.invoiceNo || 'INV'}_${new Date().toISOString().slice(0, 10)}`,
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
        title: `Profit_Report_${invoice.invoiceNo || 'INV'}_${new Date().toISOString().slice(0, 10)}`,
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
      const m = item.meters || item.billedQuantity || (item.pieces ? Math.round((item.pieces / 5) * 100) / 100 : item.totalSqFt);
      const pcs = item.pieces || Math.round(m * 5);
      return `${m} میٹر (${pcs} پیس)`;
    }
    if (isRunning) {
      const rft = item.runningFeet || item.billedQuantity || item.totalSqFt;
      return `${rft} رننگ فٹ (${item.thicknessSutar || 3}" چوڑائی)`;
    }
    if (isGolaBox) {
      const b = item.boxes || item.billedQuantity || item.pieces || 1;
      return `${b} بکس`;
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
      return `${item.totalSqFt} ${item.unit || 'فٹ'}`;
    }
    if (item.quantity || item.pieces) {
      return `${item.quantity || item.pieces} عدد`;
    }
    return '-';
  };

  // -------------------------------------------------------------
  // Calculate Item-Level Cost & Profit Analytics
  // -------------------------------------------------------------
  const items = invoice.items || [];
  let totalCalculatedCost = 0;
  let totalCalculatedRevenue = 0;
  let totalCalculatedSqFt = 0;

  const itemsWithProfit = items.map((item, originalIndex) => {
    let qty = 1;
    if (item.unit === 'Meter') {
      qty = Number(item.meters) || Number(item.billedQuantity) || (Number(item.pieces) / 5) || Number(item.totalSqFt) || 1;
    } else if (item.unit === 'R.Ft.') {
      qty = Number(item.runningFeet) || Number(item.billedQuantity) || Number(item.totalSqFt) || 1;
    } else if (item.unit === 'Box') {
      qty = Number(item.boxes) || Number(item.billedQuantity) || Number(item.pieces) || 1;
    } else if (item.unit === 'Piece') {
      qty = Number(item.pieces) || Number(item.billedQuantity) || 1;
    } else {
      qty = Number(item.totalSqFt) || Number(item.sqft) || Number(item.pieces) || Number(item.quantity) || 1;
    }

    const saleRate = Number(item.ratePerSqFt) || Number(item.rate) || 0;
    const lineAmount = Number(item.amount) || Math.round(qty * saleRate);

    // Reliable unit cost calculation
    const costRate = Number(item.costPerSqFt) ||
      Number(item.purchasePrice) ||
      Number(item.unitCost) ||
      Math.round(saleRate * 0.72);

    const lineCost = Math.round(qty * costRate);
    const lineProfit = Math.round(lineAmount - lineCost);
    const marginPct = lineAmount > 0 ? Math.round((lineProfit / lineAmount) * 100) : 0;

    totalCalculatedCost += lineCost;
    totalCalculatedRevenue += lineAmount;
    totalCalculatedSqFt += qty;

    return {
      ...item,
      originalIndex,
      qty,
      saleRate,
      costRate,
      lineCost,
      lineAmount,
      lineProfit,
      marginPct
    };
  });

  // Financial profit & loss calculations
  const carriageCharges = Number(invoice.carriageCharges || 0);
  const labourCharges = Number(invoice.labourCharges || 0);
  const polishCharges = Number(invoice.polishCharges || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const grandTotal = Number(invoice.grandTotal || totalCalculatedRevenue);
  const paidAmount = Number(invoice.paidAmount || 0);
  const balanceDue = Number(invoice.balanceDue || 0);

  // Net Profit = (Total Revenue - Total Cost) + Extra Charges - Discount
  const rawItemsGrossProfit = Math.round(totalCalculatedRevenue - totalCalculatedCost);
  const totalNetProfit = Math.round(rawItemsGrossProfit + polishCharges + labourCharges + carriageCharges - discountAmount);
  const overallMarginPct = grandTotal > 0 ? Math.round((totalNetProfit / grandTotal) * 100) : 0;

  // Real Customer Data
  const customerName = invoice.customerName || customer?.name || 'عام خریدار (Cash Customer)';
  const customerCategory = invoice.customerCategory || invoice.customerType || customer?.category || '';
  const customerPhone = invoice.customerPhone || customer?.phone || customer?.contact || '-';
  const customerAddress = invoice.customerAddress || invoice.address || customer?.address || (invoice.carrier ? `بذریعہ: ${invoice.carrier}` : 'فیکٹری گیٹ ڈلیوری');
  const customerCity = invoice.city || customer?.city || '';

  const minRows = 5;
  const fillerCount = Math.max(0, minRows - itemsWithProfit.length);
  const fillerRows = Array.from({ length: fillerCount });

  const handleCopyWhatsApp = () => {
    const lines = [
      `*${companyUrdu}*`,
      `*بل منافع رپورٹ (Profit Report)*`,
      `---------------------------------`,
      `*بل نمبر:* ${invoice.invoiceNo}`,
      `*گاہک:* ${customerName}`,
      customerPhone !== '-' ? `*فون:* ${customerPhone}` : null,
      `*تاریخ:* ${formatUrduDate(invoice.date || invoice.createdAt)}`,
      `---------------------------------`,
      `*کل لاگت:* Rs. ${totalCalculatedCost.toLocaleString()}`,
      `*کل بل رقم:* Rs. ${grandTotal.toLocaleString()}`,
      `*خالص منافع:* Rs. ${totalNetProfit.toLocaleString()} (${overallMarginPct}%)`,
      `*وصولی:* Rs. ${paidAmount.toLocaleString()} | *بقایا:* Rs. ${balanceDue.toLocaleString()}`,
      `---------------------------------`,
      `رابطہ: ${factoryPhone}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
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
        {/* Header Control Bar (Clean light styling matching BillPrintModal) */}
        <div
          className="modal-header print-hide"
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} style={{ color: 'var(--accent-blue, #2563eb)' }} />
              <span>Profit Bill Report Preview</span>
            </span>

            {/* Print Format Switcher */}
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
                <span>A4 Report</span>
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
              style={{
                fontSize: '0.76rem',
                padding: '5px 14px',
                background: 'var(--accent-blue, #2563eb)',
                borderColor: 'var(--accent-blue, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
                color: '#ffffff'
              }}
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

            {/* ============================================================= */}
            {/* FORMAT 1: EXACT A4 PROFIT BILL REPORT                         */}
            {/* ============================================================= */}
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
                {/* 1. TOP HEADER BAR (Bilingual Factory Name: English Left, Urdu Right) */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    color: '#ffffff',
                    padding: '12px 18px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    direction: 'ltr',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {/* Left: English Factory Name */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#ffffff', fontFamily: 'system-ui, sans-serif', letterSpacing: '-0.2px' }}>
                      {companyEnglish}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#dbeafe', fontFamily: 'system-ui, sans-serif' }}>
                      Ph: {factoryPhone}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#bfdbfe', fontFamily: 'system-ui, sans-serif' }}>
                      {factoryAddress}
                    </div>
                  </div>

                  {/* Right: Urdu Factory Name & Logo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', direction: 'rtl' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right' }}>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.35, letterSpacing: '0.01em' }}>
                        {companyUrdu}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#bfdbfe', fontWeight: 600, lineHeight: 1.3 }}>
                        معیاری ماربل، گرینائٹ اور ٹائلز کا بااعتماد مرکز
                      </div>
                    </div>

                    {/* Peak Geometric Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="38" height="30" viewBox="0 0 54 40" fill="none">
                        <polygon points="4,38 22,6 38,38" fill="#1d4ed8" />
                        <polygon points="18,38 34,2 50,38" fill="#38bdf8" opacity="0.95" />
                        <polygon points="14,38 26,14 40,38" fill="#93c5fd" opacity="0.85" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Main Body Section */}
                <div style={{ padding: '12px 14px' }}>

                  {/* 2. INVOICE META & REPORT TITLE ROW */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    {/* Report Title & Document Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
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
                        <TrendingUp size={22} color="#2563eb" strokeWidth={2.2} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e40af', lineHeight: 1.35 }}>
                          بل منافع رپورٹ
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.35 }}>
                          (لاگت و منافع گوشوارہ)
                        </div>
                      </div>
                    </div>

                    {/* Invoice Number & Date Box */}
                    <div
                      style={{
                        background: '#f0f7ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '7px',
                        padding: '6px 12px',
                        minWidth: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        textAlign: 'right',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.3 }}>بل نمبر</div>
                      <div
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 900,
                          color: '#1e3a8a',
                          fontFamily: 'var(--font-mono), monospace',
                          letterSpacing: '0.02em',
                          lineHeight: 1.2
                        }}
                      >
                        {invoice.invoiceNo || 'INV-2026-0001'}
                      </div>
                      <div
                        style={{
                          borderTop: '1px dashed #bfdbfe',
                          marginTop: '2px',
                          paddingTop: '3px',
                          fontSize: '0.72rem',
                          color: '#1e40af',
                          fontWeight: 700,
                          lineHeight: 1.3
                        }}
                      >
                        تاریخ: {formatUrduDate(invoice.date || invoice.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* 3. CUSTOMER INFO CARD */}
                  <div
                    style={{
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      background: '#f8fbff',
                      padding: '8px 12px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    {/* Customer Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
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
                        <User size={17} color="#2563eb" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.3 }}>گاہک کا نام</div>
                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.3 }}>
                          {customerName} {customerCategory ? `(${customerCategory})` : ''}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.3, marginTop: '1px' }}>فون نمبر</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e40af', fontFamily: 'var(--font-mono), monospace', lineHeight: 1.2 }}>
                          {customerPhone}
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div style={{ width: '1px', height: '48px', background: '#bfdbfe' }} />

                    {/* Location & Delivery */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
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
                        <MapPin size={17} color="#2563eb" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700, lineHeight: 1.3 }}>مقام / ڈلیوری ایڈریس</div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.3 }}>
                          {customerAddress}
                        </div>
                        {customerCity && (
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e40af', lineHeight: 1.3 }}>
                            {customerCity}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. ITEMS & PROFIT TABLE */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: '10px',
                      fontSize: '0.76rem'
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
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '32px', border: '1px solid #1e40af' }}>#</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #1e40af' }}>تفصیل آئٹم</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '70px', border: '1px solid #1e40af' }}>پیمائش</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '58px', border: '1px solid #1e40af' }}>خرید ریٹ</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '58px', border: '1px solid #1e40af' }}>سیل ریٹ</th>
                        <th style={{ padding: '6px 5px', textAlign: 'center', width: '75px', border: '1px solid #1e40af' }}>کل لاگت</th>
                        <th style={{ padding: '6px 5px', textAlign: 'center', width: '75px', border: '1px solid #1e40af' }}>کل سیل</th>
                        <th style={{ padding: '6px 5px', textAlign: 'center', width: '75px', border: '1px solid #1e40af' }}>منافع</th>
                        <th style={{ padding: '6px 4px', textAlign: 'center', width: '48px', border: '1px solid #1e40af' }}>مارجن %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsWithProfit.map((item, idx) => {
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
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 800, color: '#1e40af' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.82rem', color: '#1e3a8a' }}>
                              {item.name}
                              {item.thicknessSutar ? (
                                <span style={{ fontSize: '0.70rem', color: '#2563eb', marginRight: '5px', fontWeight: 700 }}>
                                  [{item.thicknessSutar} سوتر]
                                </span>
                              ) : null}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#475569' }}>
                              {formatItemDimension(item)}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#64748b' }}>
                              {Number(item.costRate).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 700, color: '#2563eb' }}>
                              {Number(item.saleRate).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#475569' }}>
                              Rs. {Number(item.lineCost).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#1e3a8a' }}>
                              Rs. {Number(item.lineAmount).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 5px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 900, color: item.lineProfit >= 0 ? '#059669' : '#dc2626' }}>
                              Rs. {Number(item.lineProfit).toLocaleString()}
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: item.lineProfit >= 0 ? '#059669' : '#dc2626' }}>
                              {item.marginPct}%
                            </td>
                          </tr>
                        );
                      })}

                      {/* Filler rows if items are few */}
                      {fillerRows.map((_, fIdx) => {
                        const globalIdx = itemsWithProfit.length + fIdx;
                        const isOdd = globalIdx % 2 === 1;
                        const rowBg = isOdd ? '#f1f5f9' : '#ffffff';
                        return (
                          <tr
                            key={`fill-${fIdx}`}
                            style={{
                              height: '24px',
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
                            <td style={{ border: '1px solid #e2e8f0' }}>&nbsp;</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* 5. TOTALS & PROFIT SUMMARY SECTION */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '10px', marginBottom: '10px', alignItems: 'stretch' }}>
                    {/* Left: Cost & Profit Breakdown */}
                    <div
                      style={{
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        background: '#eff6ff',
                        padding: '10px 12px',
                        fontSize: '0.78rem',
                        boxShadow: '0 1px 3px rgba(37,99,235,0.03)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '3px' }}>
                          لاگت و منافع خلاصہ:
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e3a8a' }}>
                          <span>کل فیکٹری لاگت:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 700 }}>Rs. {totalCalculatedCost.toLocaleString()}</span>
                        </div>
                        {carriageCharges > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                            <span>+ کرایہ باربرداری:</span>
                            <span style={{ fontFamily: 'var(--font-mono), monospace' }}>+ Rs. {carriageCharges.toLocaleString()}</span>
                          </div>
                        )}
                        {labourCharges > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                            <span>+ مزدوری و لوڈنگ:</span>
                            <span style={{ fontFamily: 'var(--font-mono), monospace' }}>+ Rs. {labourCharges.toLocaleString()}</span>
                          </div>
                        )}
                        {polishCharges > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                            <span>+ پالش و کٹائی:</span>
                            <span style={{ fontFamily: 'var(--font-mono), monospace' }}>+ Rs. {polishCharges.toLocaleString()}</span>
                          </div>
                        )}
                        {discountAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                            <span>- رعایت (ڈسکاؤنٹ):</span>
                            <span style={{ fontFamily: 'var(--font-mono), monospace' }}>- Rs. {discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* NET PROFIT RIBBON */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          marginTop: '6px',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <span>خالص منافع (Net Profit):</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.98rem', color: '#ffffff' }}>
                          Rs. {totalNetProfit.toLocaleString()} ({overallMarginPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Right: Bill & Payment Summary */}
                    <div
                      style={{
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        background: '#ffffff',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '4px',
                        fontSize: '0.80rem',
                        boxShadow: '0 1px 3px rgba(37,99,235,0.03)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '3px' }}>
                          بل رقم و ادائیگی:
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1e3a8a' }}>کل بل رقم:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#1e3a8a', fontSize: '0.92rem' }}>
                            Rs. {grandTotal.toLocaleString()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#059669', fontWeight: 700 }}>
                          <span>نقد وصولی:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>
                            Rs. {paidAmount.toLocaleString()}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: balanceDue > 0 ? '#dc2626' : '#059669',
                            fontWeight: 800,
                            borderTop: '1px dashed #bfdbfe',
                            paddingTop: '4px'
                          }}
                        >
                          <span>بقایا رقم:</span>
                          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>
                            Rs. {balanceDue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed #bfdbfe', paddingTop: '4px', fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>
                        فیکٹری ایڈمن و منافع ریکارڈ
                      </div>
                    </div>
                  </div>

                  {/* 6. SIGNATURES ROW */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '8px', marginBottom: '6px' }}>
                    {/* Munshi Signature */}
                    <div style={{ textAlign: 'center', width: '160px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <div style={{ borderBottom: '1.2px dashed #94a3b8', width: '100%', height: '8px' }} />
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.3 }}>دستخط منشی / بل آپریٹر</div>
                      <div style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: 1.2 }}>(تیار کنندہ بل)</div>
                    </div>

                    {/* Admin Approval Signature */}
                    <div style={{ textAlign: 'center', width: '180px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <div style={{ borderBottom: '1.2px dashed #2563eb', width: '100%', height: '8px' }} />
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1e40af', lineHeight: 1.3 }}>منظوری فیکٹری اونر</div>
                      <div style={{ fontSize: '0.66rem', color: '#2563eb', lineHeight: 1.2 }}>(محفوظ ریکارڈ)</div>
                    </div>
                  </div>
                </div>

                {/* 7. FOOTER BOTTOM BAR */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    color: '#ffffff',
                    padding: '6px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.76rem',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {/* Left: Phone Numbers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono), monospace', direction: 'ltr' }}>
                    <Phone size={12} color="#93c5fd" />
                    <span>{factoryPhone}</span>
                  </div>

                  {/* Right: Factory Location */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 700 }}>{factoryAddress}</span>
                    <MapPin size={13} color="#93c5fd" />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* FORMAT 2: 80MM THERMAL RECEIPT SLIP (ADMIN PROFIT FORMAT)     */}
            {/* ============================================================= */}
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
                  <div style={{ fontWeight: 900, fontSize: '13px', fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif' }}>{companyUrdu}</div>
                  <div style={{ fontWeight: 800, fontSize: '11px' }}>{companyEnglish}</div>
                  <div style={{ fontSize: '9.5px', marginTop: '2px' }}>{factoryAddress} | Ph: {factoryPhone}</div>
                  <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 700 }}>
                    Bill: {invoice.invoiceNo} (PROFIT SLIP)
                  </div>
                  <div style={{ fontSize: '9px' }}>{new Date(invoice.date || invoice.createdAt).toLocaleString()}</div>
                </div>

                <div style={{ fontSize: '10px', marginBottom: '6px' }}>
                  <div>Cust: <strong>{customerName}</strong></div>
                  {customerPhone !== '-' && <div>Ph: {customerPhone}</div>}
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '6px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px 0' }}>Item</th>
                      <th style={{ textAlign: 'center', padding: '2px 0' }}>Cost</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Sale</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsWithProfit.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                        <td style={{ padding: '2px 0' }}>
                          {it.name} <span style={{ fontSize: '8.5px' }}>({it.qty}F)</span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '2px 0' }}>{it.lineCost.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{it.lineAmount.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', padding: '2px 0', fontWeight: 800, color: it.lineProfit >= 0 ? '#059669' : '#dc2626' }}>{it.lineProfit.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & Net Profit */}
                <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Cost:</span>
                    <span>Rs. {totalCalculatedCost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Sales:</span>
                    <span>Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Discount:</span>
                      <span>-Rs. {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '11px', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 0' }}>
                    <span>NET PROFIT:</span>
                    <span>Rs. {totalNetProfit.toLocaleString()} ({overallMarginPct}%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Paid:</span>
                    <span>Rs. {paidAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Balance Due:</span>
                    <span>Rs. {balanceDue.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '8.5px', marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '4px', fontWeight: 700 }}>
                  فیکٹری ایڈمن و منافع ریکارڈ
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

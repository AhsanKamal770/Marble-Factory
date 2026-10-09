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
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Layers,
  Sparkles
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
  const isUrdu = language === 'ur';
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);

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
        title: `Admin_Profit_Report_${invoice.invoiceNo || 'INV'}_${new Date().toISOString().slice(0, 10)}`,
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
    const isGola = item.unit === 'Box' || (item.name && item.name.toLowerCase().includes('gola'));
    const isPiece = item.unit === 'Piece' || item.category === 'Flower' || item.category === 'Panels' || item.category === 'Accessories';

    if (isTile) {
      const m = item.meters || item.billedQuantity || (item.pieces ? Math.round((item.pieces / 5) * 100) / 100 : item.totalSqFt);
      const pcs = item.pieces || Math.round(m * 5);
      return `${m} میٹر (${pcs} پیس)`;
    }
    if (isRunning) {
      const rft = item.runningFeet || item.billedQuantity || item.totalSqFt;
      return `${rft} رننگ فٹ (${item.pieces || '-'} پیس)`;
    }
    if (isGola) {
      const b = item.boxes || item.billedQuantity || item.pieces || 1;
      return `${b} بکس`;
    }
    if (isPiece) {
      const p = item.pieces || item.billedQuantity || 1;
      return `${p} عدد (${item.selectedSizePreset || 'پیس'})`;
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
  // Calculate Item-Level & Category-Level Cost & Profit Analytics
  // -------------------------------------------------------------
  const items = invoice.items || [];

  // Group items by category
  const categorizedItems = {};
  let totalCalculatedCost = 0;
  let totalCalculatedRevenue = 0;
  let totalCalculatedSqFt = 0;

  items.forEach((item, originalIndex) => {
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

    const rawCat = item.category || 'Marble';
    let catKey = 'Marble';
    if (rawCat.includes('Tile') || rawCat.includes('Porcelain') || item.unit === 'Meter') catKey = 'Tiles';
    else if (rawCat.includes('Flower') || rawCat.includes('Medallion')) catKey = 'Flower';
    else if (rawCat.includes('Kali') || rawCat.includes('Black')) catKey = 'Kali Patti';
    else if (rawCat.includes('Border') || rawCat.includes('Patti')) catKey = 'Border';
    else if (rawCat.includes('Accessory') || rawCat.includes('Bond') || rawCat.includes('Filling') || rawCat.includes('Gola') || item.unit === 'Box') catKey = 'Accessories';
    else if (rawCat.includes('Panel') || rawCat.includes('Mashallah')) catKey = 'Panels';
    else catKey = rawCat || 'Marble';

    if (!categorizedItems[catKey]) {
      categorizedItems[catKey] = {
        name: catKey,
        items: [],
        totalSqFt: 0,
        totalCost: 0,
        totalRevenue: 0,
        totalProfit: 0
      };
    }

    const processedItem = {
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

    categorizedItems[catKey].items.push(processedItem);
    categorizedItems[catKey].totalSqFt += qty;
    categorizedItems[catKey].totalCost += lineCost;
    categorizedItems[catKey].totalRevenue += lineAmount;
    categorizedItems[catKey].totalProfit += lineProfit;
  });

  // Calculate overall financial profit & loss
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

  const factoryPhone = settings?.phone || '0321-6606645 | 0300-6664187';
  const factoryAddress = settings?.address || 'جھمرہ روڈ، بالمقابل پی ایس او پمپ، فیصل آباد';

  const handleCopyWhatsApp = () => {
    const lines = [
      `*محفوظ ایڈمن منافع رپورٹ (CONFIDENTIAL)*`,
      `*${settings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری'}*`,
      `---------------------------------`,
      `*بل نمبر:* ${invoice.invoiceNo}`,
      `*خریدار:* ${customerName}`,
      `*تاریخ:* ${formatUrduDate(invoice.date || invoice.createdAt)}`,
      `---------------------------------`,
      `*کیٹگری وائز منافع خلاصہ:*`,
      ...Object.keys(categorizedItems).map(catKey => {
        const cat = categorizedItems[catKey];
        const catMargin = cat.totalRevenue > 0 ? Math.round((cat.totalProfit / cat.totalRevenue) * 100) : 0;
        return `• *${cat.name}*: سیل Rs.${cat.totalRevenue.toLocaleString()} | لاگت Rs.${cat.totalCost.toLocaleString()} | منافع: *Rs.${cat.totalProfit.toLocaleString()}* (${catMargin}%)`;
      }),
      `---------------------------------`,
      `*کل فیکٹری لاگت (COGS):* Rs. ${totalCalculatedCost.toLocaleString()}`,
      `*کل بل رقم (Grand Total):* Rs. ${grandTotal.toLocaleString()}`,
      `*خالص منافع (NET PROFIT):* Rs. ${totalNetProfit.toLocaleString()} (${overallMarginPct}%)`,
      `*ادائیگی:* وصولی Rs.${paidAmount.toLocaleString()} | بقایا Rs.${balanceDue.toLocaleString()}`,
      `---------------------------------`,
      `_نوٹ: یہ رپورٹ صرف فیکٹری ایڈمن و اونر ریکارڈ کے لیے ہے۔_`
    ];

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
            margin: ${printFormat === 'thermal' ? '0mm' : '5mm'} !important;
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
            padding: ${printFormat === 'thermal' ? '3mm 2mm' : '3mm'} !important;
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
          maxWidth: printFormat === 'a4' ? '760px' : '440px',
          width: '100%',
          maxHeight: '94vh',
          transition: 'max-width 0.2s ease',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          borderRadius: '16px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Control Bar (Hidden on Print) */}
        <div className="modal-header print-hide" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-color)', background: '#0f172a', color: '#ffffff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ShieldCheck size={18} />
            </div>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={17} style={{ color: '#10b981' }} />
              <span>Admin Bill Profit Report</span>
            </span>

            {/* Print Format Switcher (English Only) */}
            <div style={{ display: 'flex', background: '#1e293b', padding: '2px', borderRadius: '6px', border: '1px solid #334155', marginLeft: '12px' }}>
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
                  background: printFormat === 'a4' ? '#059669' : 'transparent',
                  color: '#ffffff'
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
                  background: printFormat === 'thermal' ? '#059669' : 'transparent',
                  color: '#ffffff'
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
              style={{ fontSize: '0.76rem', padding: '5px 10px', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
            >
              {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Share2 size={13} />}
              <span>{copied ? 'Copied!' : 'WhatsApp'}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
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
                color: '#ffffff',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
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
              style={{ fontSize: '0.76rem', padding: '5px 14px', background: '#2563eb', borderColor: '#2563eb', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#ffffff' }}
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 6px', color: '#94a3b8' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Scroll Container */}
        <div className="modal-body" style={{ background: '#f1f5f9', padding: '12px 14px', overflowY: 'auto', flex: 1 }}>
          <div ref={printRef} className="print-target">

            {/* ============================================================= */}
            {/* FORMAT 1: EXACT A4 CONFIDENTIAL ADMIN PROFIT REPORT           */}
            {/* ============================================================= */}
            {printFormat === 'a4' && (
              <div
                dir="rtl"
                style={{
                  background: '#ffffff',
                  color: '#1e293b',
                  borderRadius: '6px',
                  boxShadow: '0 2px 14px rgba(5, 150, 105, 0.08)',
                  border: '1px solid #a7f3d0',
                  fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif',
                  maxWidth: '720px',
                  margin: '0 auto',
                  overflow: 'hidden',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                {/* 1. TOP HEADER BAR (Bilingual Header: English Left, Urdu Right) */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
                    color: '#ffffff',
                    padding: '12px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {/* Left: English Factory Name & Confidential Tag */}
                  <div
                    dir="ltr"
                    style={{
                      borderRight: '2px solid rgba(255,255,255,0.25)',
                      paddingRight: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
                      {settings?.companyNameEnglish || 'Rana Abdullah Siddique Marble Factory'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#a7f3d0', fontFamily: 'system-ui, sans-serif' }}>
                      CONFIDENTIAL ADMIN COST & PROFIT AUDIT
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#d1fae5', fontFamily: 'system-ui, sans-serif' }}>
                      Ph: {factoryPhone}
                    </div>
                  </div>

                  {/* Center / Right Factory Name & Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right' }}>
                      <div style={{ fontSize: '1.30rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.35 }}>
                        {settings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#a7f3d0', fontWeight: 700, lineHeight: 1.3 }}>
                        بل لاگت و منافع گوشوارہ (PROFIT AUDIT SLIP)
                      </div>
                    </div>

                    {/* Shield Logo */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}>
                      <ShieldCheck size={24} />
                    </div>
                  </div>
                </div>

                {/* Main Body Section */}
                <div style={{ padding: '12px 14px' }}>

                  {/* 2. INVOICE META & CONFIDENTIAL BADGE */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    {/* Document Title & KPI Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <TrendingUp size={20} color="#059669" strokeWidth={2.4} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right' }}>
                        <div style={{ fontSize: '1.30rem', fontWeight: 900, color: '#065f46', lineHeight: 1.3 }}>
                          بل منافع تجزیہ رپورٹ
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 700, lineHeight: 1.3 }}>
                          (کیٹگری وائز خریداری لاگت، سیل اور خالص منافع)
                        </div>
                      </div>
                    </div>

                    {/* Invoice Number & Date Box */}
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #a7f3d0',
                        borderRadius: '7px',
                        padding: '6px 12px',
                        minWidth: '170px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        textAlign: 'right',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div style={{ fontSize: '0.66rem', color: '#047857', fontWeight: 800, lineHeight: 1.2 }}>بل نمبر</div>
                      <div
                        style={{
                          fontSize: '0.94rem',
                          fontWeight: 900,
                          color: '#065f46',
                          fontFamily: 'var(--font-mono), monospace',
                          letterSpacing: '0.02em',
                          lineHeight: 1.2
                        }}
                      >
                        {invoice.invoiceNo || 'INV-2026-0001'}
                      </div>
                      <div
                        style={{
                          borderTop: '1px dashed #a7f3d0',
                          marginTop: '2px',
                          paddingTop: '2px',
                          fontSize: '0.70rem',
                          color: '#065f46',
                          fontWeight: 700,
                          lineHeight: 1.2
                        }}
                      >
                        تاریخ: {formatUrduDate(invoice.date || invoice.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* 3. CUSTOMER INFO CARD */}
                  <div
                    style={{
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      background: '#f8fafc',
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
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: '#d1fae5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <User size={15} color="#059669" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.66rem', color: '#047857', fontWeight: 800, lineHeight: 1.2 }}>خریدار / کھاتہ دار</div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                          {customerName} {customerCategory ? `(${customerCategory})` : ''}
                        </div>
                        <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#475569', fontFamily: 'var(--font-mono), monospace', lineHeight: 1.2 }}>
                          {customerPhone}
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div style={{ width: '1px', height: '42px', background: '#cbd5e1' }} />

                    {/* Location & Delivery */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: '#d1fae5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <MapPin size={15} color="#059669" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.66rem', color: '#047857', fontWeight: 800, lineHeight: 1.2 }}>ڈلیوری / کیریئر تفاصیل</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                          {customerAddress}
                        </div>
                        {customerCity && (
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', lineHeight: 1.2 }}>
                            {customerCity}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. CATEGORY-WISE ITEMS & PROFIT TABLE */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      padding: '2px 4px'
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={14} color="#059669" />
                        <span>کیٹگری وائز لاگت و منافع بریک ڈاؤن (Category Profit Breakdown):</span>
                      </div>
                      <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                        کل اشیاء: {items.length} ({totalCalculatedSqFt} فٹ)
                      </span>
                    </div>

                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.74rem'
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                            color: '#ffffff',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}
                        >
                          <th style={{ padding: '5px 4px', textAlign: 'center', width: '32px', border: '1px solid #064e3b' }}>#</th>
                          <th style={{ padding: '5px 6px', textAlign: 'right', border: '1px solid #064e3b' }}>تفصیل آئٹم و سائز</th>
                          <th style={{ padding: '5px 4px', textAlign: 'center', width: '65px', border: '1px solid #064e3b' }}>پیمائش/فٹ</th>
                          <th style={{ padding: '5px 4px', textAlign: 'center', width: '60px', border: '1px solid #064e3b' }}>خرید ریٹ</th>
                          <th style={{ padding: '5px 4px', textAlign: 'center', width: '60px', border: '1px solid #064e3b' }}>سیل ریٹ</th>
                          <th style={{ padding: '5px 5px', textAlign: 'center', width: '75px', border: '1px solid #064e3b' }}>کل لاگت (Cost)</th>
                          <th style={{ padding: '5px 5px', textAlign: 'center', width: '75px', border: '1px solid #064e3b' }}>کل سیل (Sale)</th>
                          <th style={{ padding: '5px 5px', textAlign: 'center', width: '75px', border: '1px solid #064e3b' }}>منافع (Profit)</th>
                          <th style={{ padding: '5px 4px', textAlign: 'center', width: '48px', border: '1px solid #064e3b' }}>مارجن %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(categorizedItems).map((catKey, catIdx) => {
                          const cat = categorizedItems[catKey];
                          const catMargin = cat.totalRevenue > 0 ? Math.round((cat.totalProfit / cat.totalRevenue) * 100) : 0;

                          return (
                            <React.Fragment key={catKey}>
                              {/* Category Section Header Row */}
                              <tr
                                style={{
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  fontWeight: 800,
                                  fontSize: '0.76rem',
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                }}
                              >
                                <td colSpan={9} style={{ padding: '4px 8px', border: '1px solid #bae6fd', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>📦 کیٹگری: <strong>{cat.name}</strong> ({cat.items.length} آئٹمز)</span>
                                    <span style={{ fontSize: '0.70rem', color: '#0284c7' }}>
                                      سب ٹوٹل فٹ: {cat.totalSqFt} | منافع: Rs. {cat.totalProfit.toLocaleString()} ({catMargin}%)
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* Category Items Rows */}
                              {cat.items.map((item, idx) => {
                                const isOdd = idx % 2 === 1;
                                const rowBg = isOdd ? '#f8fafc' : '#ffffff';
                                return (
                                  <tr
                                    key={idx}
                                    style={{
                                      background: rowBg,
                                      WebkitPrintColorAdjust: 'exact',
                                      printColorAdjust: 'exact'
                                    }}
                                  >
                                    <td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700, color: '#64748b' }}>
                                      {item.originalIndex + 1}
                                    </td>
                                    <td style={{ padding: '3px 6px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a' }}>
                                      {item.name}
                                      {item.thicknessSutar ? (
                                        <span style={{ fontSize: '0.68rem', color: '#059669', marginRight: '4px', fontWeight: 700 }}>
                                          [{item.thicknessSutar} سوتر]
                                        </span>
                                      ) : null}
                                    </td>
                                    <td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#475569' }}>
                                      {formatItemDimension(item)}
                                    </td>
                                    <td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#64748b' }}>
                                      {Number(item.costRate).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 700, color: '#2563eb' }}>
                                      {Number(item.saleRate).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '3px 5px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', color: '#475569' }}>
                                      Rs. {Number(item.lineCost).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '3px 5px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 700, color: '#0f172a' }}>
                                      Rs. {Number(item.lineAmount).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '3px 5px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 900, color: item.lineProfit >= 0 ? '#059669' : '#dc2626' }}>
                                      Rs. {Number(item.lineProfit).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #cbd5e1', fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#047857' }}>
                                      {item.marginPct}%
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Category Subtotal Summary Row */}
                              <tr
                                style={{
                                  background: '#f0fdf4',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  color: '#065f46',
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                }}
                              >
                                <td colSpan={2} style={{ padding: '3px 6px', border: '1px solid #a7f3d0', textAlign: 'right' }}>
                                  کل {cat.name} سب ٹوٹل:
                                </td>
                                <td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #a7f3d0', fontFamily: 'var(--font-mono), monospace' }}>
                                  {cat.totalSqFt} فٹ
                                </td>
                                <td colSpan={2} style={{ border: '1px solid #a7f3d0' }}>&nbsp;</td>
                                <td style={{ padding: '3px 5px', textAlign: 'center', border: '1px solid #a7f3d0', fontFamily: 'var(--font-mono), monospace' }}>
                                  Rs. {cat.totalCost.toLocaleString()}
                                </td>
                                <td style={{ padding: '3px 5px', textAlign: 'center', border: '1px solid #a7f3d0', fontFamily: 'var(--font-mono), monospace' }}>
                                  Rs. {cat.totalRevenue.toLocaleString()}
                                </td>
                                <td style={{ padding: '3px 5px', textAlign: 'center', border: '1px solid #a7f3d0', fontFamily: 'var(--font-mono), monospace', fontWeight: 900, color: '#059669' }}>
                                  Rs. {cat.totalProfit.toLocaleString()}
                                </td>
                                <td style={{ padding: '3px 4px', textAlign: 'center', border: '1px solid #a7f3d0', fontFamily: 'var(--font-mono), monospace', fontWeight: 900 }}>
                                  {catMargin}%
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 5. OVERALL FINANCIAL & NET PROFIT SUMMARY SECTION */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '10px', marginBottom: '10px', alignItems: 'stretch' }}>

                    {/* Left: Cost & Margin Deductions Audit */}
                    <div
                      style={{
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        background: '#f0fdf4',
                        padding: '10px 12px',
                        fontSize: '0.74rem',
                        boxShadow: '0 1px 3px rgba(5, 150, 105, 0.04)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#065f46', marginBottom: '6px', lineHeight: 1.3 }}>
                          📊 لاگت و منافع آڈٹ تفصیل:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#1e293b', fontSize: '0.76rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>کل مال لاگت (Stone Cost):</span>
                            <span className="font-mono">Rs. {totalCalculatedCost.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>خام مال کا منافع (Gross Margin):</span>
                            <span className="font-mono" style={{ color: '#059669', fontWeight: 800 }}>Rs. {rawItemsGrossProfit.toLocaleString()}</span>
                          </div>
                          {carriageCharges > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                              <span>+ کرایہ وصولی:</span>
                              <span className="font-mono">+ Rs. {carriageCharges.toLocaleString()}</span>
                            </div>
                          )}
                          {labourCharges > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                              <span>+ مزدوری وصولی:</span>
                              <span className="font-mono">+ Rs. {labourCharges.toLocaleString()}</span>
                            </div>
                          )}
                          {polishCharges > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                              <span>+ پالش وصولی:</span>
                              <span className="font-mono">+ Rs. {polishCharges.toLocaleString()}</span>
                            </div>
                          )}
                          {discountAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700 }}>
                              <span>- کسٹمر کو دی گئی رعایت:</span>
                              <span className="font-mono">- Rs. {discountAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px dashed #a7f3d0', paddingTop: '4px', marginTop: '4px', fontSize: '0.68rem', color: '#047857', fontWeight: 600 }}>
                        ⚠️ یہ دستاویز صرف فیکٹری ایڈمن و اکاؤنٹنٹ ریکارڈ کے لیے ہے۔
                      </div>
                    </div>

                    {/* Right: Executive Grand Net Profit Card */}
                    <div
                      style={{
                        border: '1px solid #059669',
                        borderRadius: '8px',
                        background: '#ffffff',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        fontSize: '0.80rem',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.08)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {/* Total Sale */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>کل بل رقم (Grand Total):</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 800, color: '#0f172a' }}>
                          Rs. {grandTotal.toLocaleString()}
                        </span>
                      </div>

                      {/* Total Cost */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
                        <span style={{ fontWeight: 700 }}>کل فیکٹری لاگت (COGS):</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace' }}>
                          Rs. {totalCalculatedCost.toLocaleString()}
                        </span>
                      </div>

                      {/* NET PROFIT HIGHLIGHT RIBBON */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.90rem',
                          margin: '3px 0',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <span style={{ fontSize: '0.92rem', color: '#ffffff' }}>خالص منافع (NET PROFIT):</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '1.05rem', color: '#a7f3d0' }}>
                          Rs. {totalNetProfit.toLocaleString()} ({overallMarginPct}%)
                        </span>
                      </div>

                      {/* Collection & Udhar Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#16a34a', fontWeight: 800 }}>
                        <span>نقد وصول شدہ رقم:</span>
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
                          borderTop: '1px dashed #cbd5e1',
                          paddingTop: '3px'
                        }}
                      >
                        <span>بقایا ادھار (Pending):</span>
                        <span style={{ fontFamily: 'var(--font-mono), monospace' }}>
                          Rs. {balanceDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6. SIGNATURES & AUDIT APPROVAL */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '8px', marginBottom: '4px' }}>
                    {/* Munshi Signature */}
                    <div style={{ textAlign: 'center', width: '160px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <div style={{ borderBottom: '1.2px dashed #94a3b8', width: '100%', height: '8px' }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>دستخط منشی / بل آپریٹر</div>
                      <div style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: 1.2 }}>(تیار کنندہ بل)</div>
                    </div>

                    {/* Admin Approval Signature */}
                    <div style={{ textAlign: 'center', width: '190px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <div style={{ borderBottom: '1.2px dashed #059669', width: '100%', height: '8px' }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#065f46', lineHeight: 1.3 }}>منظوری فیکٹری اونر / ایڈمن</div>
                      <div style={{ fontSize: '0.66rem', color: '#059669', lineHeight: 1.2 }}>(محفوظ ریکارڈ)</div>
                    </div>
                  </div>
                </div>

                {/* 7. FOOTER BOTTOM BAR */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                    color: '#ffffff',
                    padding: '5px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono), monospace', direction: 'ltr' }}>
                    <Phone size={11} color="#a7f3d0" />
                    <span>{factoryPhone}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 700 }}>{factoryAddress}</span>
                    <MapPin size={12} color="#a7f3d0" />
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
                  <div style={{ fontWeight: 900, fontSize: '13px', fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif' }}>{settings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری'}</div>
                  <div style={{ fontWeight: 800, fontSize: '11px' }}>{settings?.companyNameEnglish || settings?.companyName || 'RANA ABDULLAH SIDDIQUE MARBLE FACTORY'}</div>
                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>*** ADMIN PROFIT SLIP ***</div>
                  <div style={{ fontSize: '9px' }}>{factoryAddress} | Ph: {factoryPhone}</div>
                  <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 700 }}>
                    Bill: {invoice.invoiceNo}
                  </div>
                  <div style={{ fontSize: '9px' }}>{new Date(invoice.date || invoice.createdAt).toLocaleString()}</div>
                </div>

                <div style={{ fontSize: '10px', marginBottom: '6px' }}>
                  <div>Cust: <strong>{customerName}</strong></div>
                  {customerPhone !== '-' && <div>Ph: {customerPhone}</div>}
                </div>

                {/* Category-Wise Breakdown Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', marginBottom: '6px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px 0' }}>Item/Cat</th>
                      <th style={{ textAlign: 'center', padding: '2px 0' }}>Cost</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Sale</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const qty = Number(it.totalSqFt) || Number(it.sqft) || Number(it.pieces) || 1;
                      const saleR = Number(it.ratePerSqFt) || Number(it.rate) || 0;
                      const amt = Number(it.amount) || Math.round(qty * saleR);
                      const costR = Number(it.costPerSqFt) || Number(it.purchasePrice) || Math.round(saleR * 0.72);
                      const cCost = Math.round(qty * costR);
                      const pProfit = amt - cCost;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                          <td style={{ padding: '2px 0' }}>
                            {it.name} <span style={{ fontSize: '8.5px' }}>({qty}F)</span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '2px 0' }}>{cCost.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '2px 0' }}>{amt.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '2px 0', fontWeight: 800 }}>{pProfit.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals & Net Profit */}
                <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Sales:</span>
                    <span>Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Cost (COGS):</span>
                    <span>Rs. {totalCalculatedCost.toLocaleString()}</span>
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
                    <span>Paid (Cash):</span>
                    <span>Rs. {paidAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Balance Due:</span>
                    <span>Rs. {balanceDue.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', fontSize: '8.5px', marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '4px', fontWeight: 700 }}>
                  CONFIDENTIAL - FOR ADMIN RECORD ONLY
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

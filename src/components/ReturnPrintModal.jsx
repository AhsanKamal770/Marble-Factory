import React, { useState, useRef } from 'react';
import { Printer, X, FileText, Receipt, Share2, Check, Download, AlertCircle } from 'lucide-react';
import { printElement } from '../utils/printHelper';

export default function ReturnPrintModal({
  isOpen,
  onClose,
  record,
  settings
}) {
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);

  if (!isOpen || !record) return null;

  const companyUrdu = settings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری';
  const companyEnglish = settings?.companyNameEnglish || 'Rana Abdullah Siddique Marble Factory';
  const factoryPhone = settings?.phone || '0321-6606645 / 0300-6664187';
  const factoryAddressUrdu = settings?.address || 'فیصل آباد روڈ، بالمقابل ریلوے پھاٹک، جھمرہ سٹی';

  const formatUrduDate = (dateVal) => {
    const d = new Date(dateVal || Date.now());
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const urduMonths = [
      'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
      'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
    ];
    return `${day} ${urduMonths[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `Return_${record.returnNo || 'Voucher'}`,
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
        title: `Return_${record.returnNo || 'Voucher'}`,
        format: printFormat,
        isExportPDF: true,
        dir: 'rtl'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyWhatsApp = () => {
    const isWastage = record.type === 'Factory Wastage';
    const lines = [
      `*${companyUrdu}*`,
      `*${isWastage ? 'فیکٹری ضیاع و ٹوٹ پھوٹ لاگ' : 'مال واپسی و حرجانہ واؤچر'}*`,
      `واؤچر نمبر: ${record.returnNo}`,
      `تاریخ: ${new Date(record.date || record.createdAt).toLocaleDateString()}`,
      `پارٹی / اکاؤنٹ: ${record.partyName || '-'}`,
      record.refDocNo && record.refDocNo !== 'N/A' ? `ریفرنس بل: ${record.refDocNo}` : '',
      `وجہ: ${record.reason || 'N/A'}`,
      `طریقہ کار: ${record.refundMethod || record.status || '-'}`,
      `---------------------------------`,
      `*کل رقم:* Rs. ${Number(record.totalAmount || 0).toLocaleString()}`,
      `---------------------------------`,
      `رابطہ: ${factoryPhone}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWastage = record.type === 'Factory Wastage';
  const totalItemsCount = (record.items || []).length;
  const grandTotal = Number(record.totalAmount || 0);

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(3px)'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: printFormat === 'thermal' ? '440px' : '780px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Actions Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '6px',
                gap: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: printFormat === 'a4' ? '#2563eb' : 'transparent',
                  color: printFormat === 'a4' ? '#ffffff' : '#64748b'
                }}
              >
                <FileText size={13} />
                <span>A4 Voucher</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: printFormat === 'thermal' ? '#2563eb' : 'transparent',
                  color: printFormat === 'thermal' ? '#ffffff' : '#64748b'
                }}
              >
                <Receipt size={13} />
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
              title="Save as PDF"
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
                background: '#2563eb',
                borderColor: '#2563eb',
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

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: '4px 6px', color: '#64748b' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div style={{ background: '#f8fafc', padding: '16px', overflowY: 'auto', flex: 1 }}>
          <div ref={printRef} className="print-target">
            {/* ------------------------------------------------------------- */}
            {/* FORMAT 1: A4 VOUCHER TEMPLATE                                 */}
            {/* ------------------------------------------------------------- */}
            {printFormat === 'a4' && (
              <div
                dir="rtl"
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '8px',
                  boxShadow: '0 2px 14px rgba(37,99,235,0.06)',
                  border: '1px solid #bfdbfe',
                  fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif',
                  maxWidth: '720px',
                  margin: '0 auto',
                  padding: '20px 24px',
                  position: 'relative'
                }}
              >
                {/* Executive Header Banner */}
                <div
                  style={{
                    borderBottom: '2px solid #0f172a',
                    paddingBottom: '12px',
                    marginBottom: '14px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: '1.45rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          lineHeight: 1.3
                        }}
                      >
                        {companyUrdu}
                      </h1>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '3px' }}>
                        {factoryAddressUrdu}
                      </div>
                    </div>

                    <div style={{ textAlign: 'left', direction: 'ltr' }}>
                      <div
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          letterSpacing: '0.02em',
                          fontFamily: 'var(--font-sans), sans-serif'
                        }}
                      >
                        {companyEnglish}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                        Phone: {factoryPhone}
                      </div>
                    </div>
                  </div>

                  {/* Document Title Badge */}
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 18px',
                        borderRadius: '20px',
                        background: isWastage ? '#fee2e2' : '#eff6ff',
                        color: isWastage ? '#dc2626' : '#1d4ed8',
                        border: isWastage ? '1px solid #fecaca' : '1px solid #bfdbfe',
                        fontSize: '0.82rem',
                        fontWeight: 900,
                        letterSpacing: '0.03em'
                      }}
                    >
                      {isWastage ? 'فیکٹری ٹوٹ پھوٹ و ضیاع لاگ (Factory Wastage Log)' : 'اسٹاک واپسی و حرجانہ واؤچر (Official Return Slip)'}
                    </span>
                  </div>
                </div>

                {/* Voucher Meta Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px 16px',
                    fontSize: '0.8rem',
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '14px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>واؤچر نمبر:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0f172a' }}>
                      {record.returnNo}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>تاریخ:</span>
                    <span style={{ fontWeight: 700 }}>
                      {formatUrduDate(record.date || record.createdAt)} ({new Date(record.date || record.createdAt).toLocaleDateString()})
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>پارٹی / مشین:</span>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>
                      {record.partyName || '-'}
                    </span>
                  </div>

                  {record.refDocNo && record.refDocNo !== 'N/A' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>ریفرنس بل:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                        {record.refDocNo}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>نوعیت:</span>
                    <span style={{ fontWeight: 700 }}>
                      {record.type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>سیٹلمنٹ:</span>
                    <span style={{ fontWeight: 700, color: '#059669' }}>
                      {record.refundMethod || record.status || 'Cleared'}
                    </span>
                  </div>

                  {record.operatorName && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>آپریٹر:</span>
                      <span style={{ fontWeight: 700 }}>
                        {record.operatorName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.8rem',
                    marginBottom: '14px',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '7px 8px', textAlign: 'center', width: '36px', borderLeft: '1px solid #cbd5e1' }}>#</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', borderLeft: '1px solid #cbd5e1' }}>آئٹم کی تفصیل و ورائٹی</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #cbd5e1' }}>کیٹیگری</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #cbd5e1' }}>ناپ / کنڈیشن</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #cbd5e1' }}>تعداد / اسکوائر فٹ</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #cbd5e1' }}>ریٹ (Rs)</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>کل رقم (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(record.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', fontFamily: 'var(--font-mono)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, borderLeft: '1px solid #e2e8f0' }}>
                          {it.name}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#64748b' }}>
                          {it.category || 'Marble'}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                          {it.condition || it.size || '-'}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {it.sqft || it.quantity || 0} {it.unit || 'Sq.Ft'}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', fontFamily: 'var(--font-mono)' }}>
                          {Number(it.rate || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                          Rs. {Number(it.amount || ((it.sqft || it.quantity || 0) * (it.rate || 0))).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Financial Summary & Settlement Box */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    gap: '14px',
                    marginBottom: '16px'
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      padding: '10px 12px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      واپسی / ضیاع کی وجہ و تفصیل:
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.5 }}>
                      {record.reason || 'کوئی تفصیل درج نہیں کی گئی'}
                    </div>
                    {record.notes && (
                      <div style={{ color: '#64748b', marginTop: '4px', fontSize: '0.72rem' }}>
                        نوٹ: {record.notes}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: isWastage ? '#fff5f5' : '#f0fdf4',
                      borderRadius: '8px',
                      border: isWastage ? '1px solid #fecaca' : '1px solid #bbf7d0',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>
                      <span>کل آئٹمز کی تعداد:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{totalItemsCount}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                        {isWastage ? 'کل مالی نقصان:' : 'کل واپسی مالیت:'}
                      </span>
                      <span
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 900,
                          fontFamily: 'var(--font-mono)',
                          color: isWastage ? '#dc2626' : '#15803d'
                        }}
                      >
                        Rs. {grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Official Signature Blocks */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    paddingTop: '32px',
                    marginTop: '10px',
                    borderTop: '1px dashed #cbd5e1',
                    fontSize: '0.72rem',
                    textAlign: 'center',
                    color: '#475569'
                  }}
                >
                  <div>
                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontWeight: 700 }}>
                      تیار کنندہ (Prepared By)
                    </div>
                  </div>
                  <div>
                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontWeight: 700 }}>
                      گیٹ کیپر (Gate Pass Officer)
                    </div>
                  </div>
                  <div>
                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontWeight: 700 }}>
                      فیکٹری سپروائزر (Supervisor)
                    </div>
                  </div>
                  <div>
                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', fontWeight: 700 }}>
                      پارٹی کے دستخط (Receiver)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* FORMAT 2: 80MM THERMAL SLIP TEMPLATE                          */}
            {/* ------------------------------------------------------------- */}
            {printFormat === 'thermal' && (
              <div
                style={{
                  width: '76mm',
                  margin: '0 auto',
                  background: '#ffffff',
                  color: '#000000',
                  padding: '10px 8px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  lineHeight: '1.3'
                }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 900 }}>{companyEnglish}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700 }}>{companyUrdu}</div>
                  <div style={{ fontSize: '9px', marginTop: '2px' }}>Ph: {factoryPhone}</div>
                  <div style={{ fontSize: '9px', marginTop: '4px', fontWeight: 800 }}>
                    *** {isWastage ? 'WASTAGE & BREAKAGE' : 'STOCK RETURN VOUCHER'} ***
                  </div>
                </div>

                {/* Metadata */}
                <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Voucher #:</span>
                    <strong>{record.returnNo}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date:</span>
                    <span>{new Date(record.date || record.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Party:</span>
                    <strong>{record.partyName || '-'}</strong>
                  </div>
                  {record.refDocNo && record.refDocNo !== 'N/A' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ref Invoice:</span>
                      <span>{record.refDocNo}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Settlement:</span>
                    <span>{record.refundMethod || record.status || '-'}</span>
                  </div>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px 0' }}>Item</th>
                      <th style={{ textAlign: 'center', padding: '2px 0' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(record.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                        <td style={{ padding: '3px 0' }}>
                          <div style={{ fontWeight: 700 }}>{it.name}</div>
                          <div style={{ fontSize: '8px', color: '#555' }}>{it.condition || it.category}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '3px 0' }}>
                          {it.sqft || it.quantity} {it.unit || ''}
                        </td>
                        <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 700 }}>
                          {Number(it.amount || ((it.sqft || it.quantity || 0) * (it.rate || 0))).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total */}
                <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '4px 0', margin: '6px 0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900 }}>
                  <span>TOTAL AMOUNT:</span>
                  <span>Rs. {grandTotal.toLocaleString()}</span>
                </div>

                {record.reason && (
                  <div style={{ fontSize: '9px', marginBottom: '8px' }}>
                    <strong>Reason:</strong> {record.reason}
                  </div>
                )}

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '4px', borderTop: '1px dashed #000', fontSize: '9px' }}>
                  <div>Officer Sig</div>
                  <div>Receiver Sig</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useRef } from 'react';
import { Printer, X, FileText, Receipt, Share2, Check, Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
  const printRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    const lines = [
      `*${settings?.companyName || 'RANA SHAHAB MARBLE FACTORY & TILES'}*`,
      `_نام ہی کافی ہے_ - جھمرہ سٹی`,
      `---------------------------------`,
      `*Bill #:* ${invoice.invoiceNo}`,
      `*Customer:* ${invoice.customerName}`,
      invoice.carrier ? `*Delivered Via:* ${invoice.carrier}` : null,
      `*Date:* ${new Date(invoice.date || invoice.createdAt).toLocaleDateString('en-PK')}`,
      `---------------------------------`,
      `*ITEMS:*`,
      ...(invoice.items || []).map(
        (it, idx) =>
          `${idx + 1}. ${it.name} [${it.thicknessSutar ? it.thicknessSutar + ' Sutar' : '4 Sutar'}] - ${it.totalSqFt} Sq.Ft @ Rs.${it.ratePerSqFt} = Rs.${Number(it.amount).toLocaleString()}`
      ),
      `---------------------------------`,
      `*Subtotal:* Rs. ${Number(invoice.subtotal || 0).toLocaleString()}`,
      invoice.carriageCharges > 0 ? `*Carriage:* +Rs. ${Number(invoice.carriageCharges).toLocaleString()}` : null,
      invoice.labourCharges > 0 ? `*Labour:* +Rs. ${Number(invoice.labourCharges).toLocaleString()}` : null,
      invoice.polishCharges > 0 ? `*Polish:* +Rs. ${Number(invoice.polishCharges).toLocaleString()}` : null,
      invoice.discountAmount > 0 ? `*Discount:* -Rs. ${Number(invoice.discountAmount).toLocaleString()}` : null,
      `*TOTAL PAYABLE:* Rs. ${Number(invoice.grandTotal || 0).toLocaleString()}`,
      `*Paid (Wasooli):* Rs. ${Number(invoice.paidAmount || 0).toLocaleString()}`,
      `*Balance Due (Udhar):* Rs. ${Number(invoice.balanceDue || 0).toLocaleString()}`,
      `---------------------------------`,
      `شکریہ! رابطہ: 0300-7708899 / جھمرہ روڈ`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const dateFormatted = new Date(invoice.date || invoice.createdAt || Date.now()).toLocaleDateString('en-GB');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: printFormat === 'a4' ? '860px' : '480px',
          width: '95%',
          maxHeight: '92vh',
          transition: 'max-width 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="modal-header print-hide" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {language === 'ur' ? 'بل پرنٹ و ریکارڈ' : 'Print Invoice'}
            </span>

            {/* Print Format Tabs */}
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
                  background: printFormat === 'a4' ? 'var(--accent-blue)' : 'transparent',
                  color: printFormat === 'a4' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                <FileText size={13} />
                <span>A4 Bill Book</span>
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
                  background: printFormat === 'thermal' ? 'var(--accent-blue)' : 'transparent',
                  color: printFormat === 'thermal' ? '#ffffff' : 'var(--text-secondary)'
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
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              {copied ? <Check size={13} style={{ color: '#059669' }} /> : <Share2 size={13} />}
              <span>{copied ? 'Copied!' : 'WhatsApp'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              style={{ fontSize: '0.75rem', padding: '5px 12px' }}
            >
              <Printer size={13} />
              <span>Print Now</span>
            </button>

            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Scroll Container */}
        <div className="modal-body" style={{ background: '#f1f5f9', padding: '20px', overflowY: 'auto' }}>
          <div ref={printRef} className="print-target">
            {/* ------------------------------------------------------------- */}
            {/* FORMAT 1: AUTHENTIC A4 BILL BOOK REPLICA                      */}
            {/* ------------------------------------------------------------- */}
            {printFormat === 'a4' && (
              <div
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  padding: '24px 28px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  border: '2px solid #0f172a',
                  fontFamily: 'var(--font-main)',
                  maxWidth: '780px',
                  margin: '0 auto',
                  lineHeight: 1.3,
                  direction: 'rtl'
                }}
              >
                {/* Traditional Bill Book Top Header */}
                <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {/* Urdu Factory Title & Slogan */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                      <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        color: '#1e3a8a',
                        margin: '2px 0 0 0',
                        letterSpacing: '-0.02em'
                      }}>
                        رانا شہاب ماربل فیکٹری
                      </h1>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-urdu)', marginTop: '2px' }}>
                        نام ہی کافی ہے — رانا شہاب
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                        فیصل آباد روڈ، بالمقابل پی ایس او پٹرول پمپ، جھمرہ سٹی | فون: <span dir="ltr">0321-6606645</span>
                      </div>
                    </div>

                    {/* Bill Meta Stamp */}
                    <div style={{
                      textAlign: 'left',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      minWidth: '170px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>بل نمبر</div>
                      <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 900, color: '#1e3a8a' }}>
                        {invoice.invoiceNo}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginTop: '3px' }}>
                        تاریخ: <span dir="ltr">{dateFormatted}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer & Carrier Dispatch Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  fontSize: '0.8rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>جناب: </span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{invoice.customerName}</strong>
                    {invoice.customerPhone && (
                      <span style={{ color: '#475569', marginLeft: '6px' }} dir="ltr">({invoice.customerPhone})</span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>مال بدست: </span>
                    <strong style={{ color: '#0f172a' }}>{invoice.carrier || invoice.notes || 'فیکٹری ڈیلیوری'}</strong>
                  </div>
                </div>

                {/* Line Items Table */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.78rem',
                  marginBottom: '14px'
                }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '36px', borderLeft: '1px solid #cbd5e1' }}>#</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', borderLeft: '1px solid #cbd5e1' }}>کوالٹی</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '80px', borderLeft: '1px solid #cbd5e1' }}>موٹائی</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right', width: '130px', borderLeft: '1px solid #cbd5e1' }}>انچ، فٹ</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '80px', borderLeft: '1px solid #cbd5e1' }}>فٹ پیمائش</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '75px', borderLeft: '1px solid #cbd5e1' }}>ریٹ</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left', width: '90px' }}>روپے</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, borderLeft: '1px solid #cbd5e1' }}>{item.name}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '1px solid #cbd5e1', fontSize: '0.72rem', fontWeight: 700, color: '#1e3a8a' }}>
                          {item.thicknessSutar ? `${item.thicknessSutar} سوتر` : '4 سوتر'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', borderLeft: '1px solid #cbd5e1', color: '#475569' }} dir="ltr">
                          {item.dimensions || `${item.length || 0}ft × ${item.width || 0}ft`}
                        </td>
                        <td className="font-mono" style={{ padding: '6px 8px', textAlign: 'left', borderLeft: '1px solid #cbd5e1', fontWeight: 600 }}>
                          {item.totalSqFt}
                        </td>
                        <td className="font-mono" style={{ padding: '6px 8px', textAlign: 'left', borderLeft: '1px solid #cbd5e1' }}>
                          {Number(item.ratePerSqFt || 0).toLocaleString()}
                        </td>
                        <td className="font-mono" style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>
                          {Number(item.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Financial Summary & Settlement Split */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'start', marginBottom: '16px' }}>
                  {/* Terms & Disclaimers in Urdu */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    fontFamily: 'var(--font-urdu)',
                    fontWeight: 800
                  }}>
                    بھول چوک لین دین یقیناً ہمارے پاس سب سے زیادہ ورائٹی ہے
                  </div>

                  {/* Calculations Total Column */}
                  <div style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    background: '#ffffff',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>میزان مال:</span>
                      <span className="font-mono">{Number(invoice.subtotal || 0).toLocaleString()}</span>
                    </div>

                    {Number(invoice.carriageCharges || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>کرایہ باربرداری:</span>
                        <span className="font-mono">+ {Number(invoice.carriageCharges).toLocaleString()}</span>
                      </div>
                    )}

                    {Number(invoice.labourCharges || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>مزدوری و لوڈنگ:</span>
                        <span className="font-mono">+ {Number(invoice.labourCharges).toLocaleString()}</span>
                      </div>
                    )}

                    {Number(invoice.polishCharges || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                        <span>پالش و کٹائی:</span>
                        <span className="font-mono">+ {Number(invoice.polishCharges).toLocaleString()}</span>
                      </div>
                    )}

                    {Number(invoice.discountAmount || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                        <span>رعایت:</span>
                        <span className="font-mono">- {Number(invoice.discountAmount).toLocaleString()}</span>
                      </div>
                    )}

                    <div style={{
                      borderTop: '2px solid #0f172a',
                      paddingTop: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      color: '#0f172a'
                    }}>
                      <span>ٹوٹل رقم:</span>
                      <span className="font-mono" style={{ color: '#1e3a8a' }}>{Number(invoice.grandTotal || 0).toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
                      <span>ایڈوانس:</span>
                      <span className="font-mono">{Number(invoice.paidAmount || 0).toLocaleString()}</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: Number(invoice.balanceDue) > 0 ? '#dc2626' : '#64748b',
                      fontWeight: 800,
                      borderTop: '1px dashed #cbd5e1',
                      paddingTop: '3px'
                    }}>
                      <span>بقایا:</span>
                      <span className="font-mono">{Number(invoice.balanceDue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Dual Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '28px', borderTop: '1px solid #cbd5e1' }}>
                  <div style={{ textAlign: 'center', width: '180px' }}>
                  </div>

                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ borderBottom: '1px dashed #94a3b8', height: '24px' }}></div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a8a', marginTop: '4px', fontFamily: 'var(--font-urdu)' }}>
                      دستخط
                    </div>
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
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>RANA SHAHAB MARBLE</div>
                  <div style={{ fontSize: '10px' }}>MARBLE & TILES KARKHANA</div>
                  <div style={{ fontSize: '9px' }}>Jhumra City | Ph: 0300-7708899</div>
                  <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 700 }}>
                    {invoice.invoiceNo}
                  </div>
                  <div style={{ fontSize: '9px' }}>{new Date(invoice.date || invoice.createdAt).toLocaleString()}</div>
                </div>

                <div style={{ fontSize: '10px', marginBottom: '6px' }}>
                  <div>Cust: <strong>{invoice.customerName}</strong></div>
                  {invoice.carrier && <div>Via: {invoice.carrier}</div>}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '6px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px 0' }}>Item</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Sq.Ft</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '2px 0' }}>
                          {it.name} <span style={{ fontSize: '9px' }}>({it.thicknessSutar || 4}S)</span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{it.totalSqFt}</td>
                        <td style={{ textAlign: 'right', padding: '2px 0' }}>{it.ratePerSqFt}</td>
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
                  {invoice.carriageCharges > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Carriage:</span>
                      <span>+Rs. {Number(invoice.carriageCharges).toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.labourCharges > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Labour:</span>
                      <span>+Rs. {Number(invoice.labourCharges).toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.discountAmount > 0 && (
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
                  شکریہ! برائے مہربانی رسید سنبھال کر رکھیں۔
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useState } from 'react';
import { Printer, X, FileText, CheckCircle2, Phone, MapPin, Download } from 'lucide-react';
import { printElement } from '../../utils/printHelper';

export default function PrintableKhataModal({ isOpen, onClose, customer, timeline = [], settings }) {
  const printRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !customer) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(printRef, {
        title: `Khata_${customer.name || 'Statement'}`,
        format: 'thermal',
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
        title: `Khata_${customer.name || 'Statement'}`,
        format: 'thermal',
        isExportPDF: true,
        dir: 'rtl'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const companyName = settings?.companyNameEnglish || settings?.companyName || 'Rana Abdullah Siddique Marble Factory';
  const companyNameUrdu = settings?.companyNameUrdu || 'رانا عبداللہ صدیق ماربل فیکٹری';
  const tagline = settings?.tagline || 'معیاری ماربل، گرینائٹ اور ٹائلز کا بااعتماد مرکز';
  const phone = settings?.phone || '0321-6606645';
  const phoneSecondary = settings?.phoneSecondary || '0300-6664187';
  const address = settings?.address || 'Faisalabad Road near PSO Petrol Pump, Jhumra City';

  const totalBilled = Number(customer.totalBilled || 0);
  const totalPaid = Number(customer.totalPaid || 0);
  const balanceDue = Number(customer.balanceDue || 0);

  return (
    <div className="modal-overlay" style={{
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
      padding: '20px'
    }}>
      <div className="modal-card" style={{
        width: '100%',
        maxWidth: '460px',
        maxHeight: '90vh',
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Customer Khata Statement Slip
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div ref={printRef} className="thermal-receipt-preview" style={{
            background: '#ffffff',
            color: '#000000',
            padding: '16px 14px',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.4
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontFamily: 'var(--font-urdu), "Noto Nastaliq Urdu", serif', fontWeight: 900 }}>
                {companyNameUrdu}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '2px' }}>
                {companyName}
              </div>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                {address}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                Ph: {phone} • {phoneSecondary}
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
              {customer.phone && (
                <div><strong>Phone:</strong> {customer.phone}</div>
              )}
              {customer.city && (
                <div><strong>City:</strong> {customer.city}</div>
              )}
              <div><strong>Date:</strong> {new Date().toLocaleString()}</div>
            </div>

            {/* Summary Account Totals */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '8px 10px',
              marginBottom: '10px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Purchases / Billed:</span>
                <strong>Rs. {totalBilled.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>Total Wasooli / Paid:</span>
                <strong>Rs. {totalPaid.toLocaleString()}</strong>
              </div>
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
              {timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '6px', color: '#64748b' }}>No transactions recorded</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {timeline.slice(0, 8).map((t, idx) => {
                    const isInv = t.type === 'INVOICE';
                    const dateStr = new Date(t.sortDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderBottom: '1px dotted #e2e8f0', paddingBottom: '2px' }}>
                        <span>{dateStr} • {isInv ? `Bill #${t.invoiceNo}` : `Rec #${t.paymentNo || 'Payment'}`}</span>
                        <strong style={{ color: isInv ? '#dc2626' : '#059669' }}>
                          {isInv ? `+Rs. ${(t.debit || t.amount).toLocaleString()}` : `-Rs. ${(t.credit || t.amount).toLocaleString()}`}
                        </strong>
                      </div>
                    );
                  })}
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
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-primary)',
          gap: '8px'
        }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
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
                color: '#059669',
                borderColor: '#10b981',
                background: 'rgba(16, 185, 129, 0.08)',
                fontWeight: 700
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
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} />
              <span>Print 80mm Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

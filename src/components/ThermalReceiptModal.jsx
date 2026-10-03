import React, { useRef, useState } from 'react';
import { Printer, X, Download, Share2, Check } from 'lucide-react';
import { printElement } from '../utils/printHelper';

export default function ThermalReceiptModal({ isOpen, onClose, invoice, settings, customer }) {
  const receiptRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(receiptRef, {
        title: `Receipt_${invoice.invoiceNo || 'Thermal'}`,
        format: 'thermal',
        isExportPDF: false,
        dir: 'ltr'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsPrinting(true);
    try {
      await printElement(receiptRef, {
        title: `Receipt_${invoice.invoiceNo || 'Thermal'}`,
        format: 'thermal',
        isExportPDF: true,
        dir: 'ltr'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const invoiceDate = new Date(invoice.date || invoice.createdAt || Date.now()).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} className="text-gold" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              80mm Thermal Receipt Preview
            </h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ background: '#0b0f19', padding: '16px', display: 'flex', justifyContent: 'center' }}>
          {/* Printable 80mm Thermal Slip Area */}
          <div
            ref={receiptRef}
            className="thermal-receipt-container print-area"
            style={{ width: '76mm', minHeight: '120mm' }}
          >
            {/* Header */}
            <div className="thermal-header">
              <div className="thermal-title">
                {settings?.companyName || 'AL-MADINA MARBLE & GRANITE'}
              </div>
              <div style={{ fontSize: '10px', marginTop: '2px', color: '#222' }}>
                {settings?.tagline || 'Factory & Wholesale Depot'}
              </div>
              <div style={{ fontSize: '10px', marginTop: '2px' }}>
                {settings?.address || 'Industrial Area, Karachi'}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                Ph: {settings?.phone || '0300-1234567'}
              </div>
            </div>

            {/* Bill Info */}
            <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Bill #: {invoice.invoiceNo}</strong>
                <span>{invoice.paymentStatus?.toUpperCase()}</span>
              </div>
              <div>Date: {invoiceDate}</div>
              <div style={{ borderTop: '1px dotted #000', margin: '4px 0' }}></div>
              <div><strong>Customer:</strong> {invoice.customerName || 'Walk-in Customer'}</div>
              {invoice.customerPhone && <div><strong>Phone:</strong> {invoice.customerPhone}</div>}
            </div>

            <div className="thermal-divider-double"></div>

            {/* Items Table */}
            <table className="thermal-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Item / Sizing</th>
                  <th style={{ width: '25%', textAlign: 'right' }}>Sq.Ft / Qty</th>
                  <th style={{ width: '30%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      {it.dimensions && (
                        <div style={{ fontSize: '9.5px', color: '#444' }}>
                          {it.dimensions}
                        </div>
                      )}
                      <div style={{ fontSize: '9.5px', color: '#555' }}>
                        @ Rs. {it.ratePerSqFt || it.ratePerPiece || it.ratePerBox}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {it.totalSqFt ? `${it.totalSqFt} sf` : (it.boxes ? `${it.boxes} bx` : `${it.pieces} pcs`)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      Rs. {Number(it.amount || (it.totalSqFt * it.ratePerSqFt) || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="thermal-divider-double"></div>

            {/* Summary Totals */}
            <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <strong>Rs. {Number(invoice.subtotal || 0).toLocaleString()}</strong>
              </div>

              {Number(invoice.carriageCharges || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Carriage / Transport:</span>
                  <span>+ Rs. {Number(invoice.carriageCharges).toLocaleString()}</span>
                </div>
              )}

              {Number(invoice.labourCharges || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Loading / Labour:</span>
                  <span>+ Rs. {Number(invoice.labourCharges).toLocaleString()}</span>
                </div>
              )}

              {Number(invoice.polishCharges || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Edge Polish / Cutting:</span>
                  <span>+ Rs. {Number(invoice.polishCharges).toLocaleString()}</span>
                </div>
              )}

              {Number(invoice.discountAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>- Rs. {Number(invoice.discountAmount).toLocaleString()}</span>
                </div>
              )}

              <div className="thermal-divider"></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900 }}>
                <span>NET TOTAL:</span>
                <span>Rs. {Number(invoice.grandTotal || 0).toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000', fontWeight: 700, marginTop: '2px' }}>
                <span>Paid ({invoice.paymentMethod || 'Cash'}):</span>
                <span>Rs. {Number(invoice.paidAmount || 0).toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginTop: '2px', borderTop: '1px dashed #000', paddingTop: '2px' }}>
                <span>Current Bill Due:</span>
                <span>Rs. {Number(invoice.balanceDue || 0).toLocaleString()}</span>
              </div>

              {customer && Number(customer.balanceDue || 0) > 0 && (
                <div style={{ marginTop: '4px', padding: '4px', background: '#f0f0f0', borderRadius: '3px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Khata Balance:</span>
                    <strong>Rs. {Number(customer.balanceDue).toLocaleString()}</strong>
                  </div>
                </div>
              )}
            </div>

            {invoice.notes && (
              <div style={{ fontSize: '10px', marginTop: '6px', fontStyle: 'italic', borderTop: '1px dotted #999', paddingTop: '4px' }}>
                Note: {invoice.notes}
              </div>
            )}

            {/* Footer */}
            <div className="thermal-footer">
              <div style={{ fontWeight: 700 }}>{settings?.receiptFooter || 'Thank you for your business!'}</div>
              <div style={{ marginTop: '2px' }}>Software by Marble Factory Suite</div>
              <div style={{ marginTop: '4px', fontSize: '9px' }}>*** CUSTOMER COPY ***</div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportPDF}
              disabled={isPrinting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', borderColor: '#10b981', fontWeight: 700 }}
            >
              <Download size={15} /> Save PDF
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint} disabled={isPrinting}>
              <Printer size={16} /> Print 80mm Slip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

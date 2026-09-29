import React, { useState } from 'react';
import { Printer, FileText, Receipt } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import ThermalReceiptModal from '../../components/ThermalReceiptModal';

const sampleTestInvoice = {
  invoiceNo: 'TEST-SLIP-01',
  date: new Date().toISOString(),
  customerName: 'Test Thermal Customer',
  customerPhone: '0300-1234567',
  items: [
    { name: 'Ziarat White Super Slab', dimensions: '5.5ft x 3.0ft (10 Slabs)', totalSqFt: 165, ratePerSqFt: 380, amount: 62700 },
    { name: 'Jet Black Granite', dimensions: '8.0ft x 3.0ft (2 Slabs)', totalSqFt: 48, ratePerSqFt: 650, amount: 31200 }
  ],
  subtotal: 93900,
  carriageCharges: 2500,
  labourCharges: 1500,
  discountAmount: 1900,
  grandTotal: 96000,
  paidAmount: 60000,
  balanceDue: 36000,
  paymentStatus: 'Half Paid',
  paymentMethod: 'Cash',
  notes: 'Thermal printer alignment test voucher.'
};

export default function PrintTemplateSettings({ formData, setFormData, onSave }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);
  const [isTestPrintOpen, setIsTestPrintOpen] = useState(false);

  const format = formData.defaultInvoiceFormat || 'a4';
  const setFormat = (val) => setFormData({ ...formData, defaultInvoiceFormat: val });

  const FormatOption = ({ value, icon: Icon, title, subtitle }) => (
    <button
      type="button"
      onClick={() => setFormat(value)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${format === value ? 'var(--accent-blue)' : 'var(--border-color)'}`,
        background: format === value ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
        cursor: 'pointer',
        textAlign: 'left'
      }}
    >
      <Icon size={20} color={format === value ? 'var(--accent-blue)' : 'var(--text-muted)'} />
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</div>
      </div>
    </button>
  );

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Printer size={18} className="text-gold" /> {tr('Print & Receipt Template', 'پرنٹ و رسید سانچہ')}
        </h3>
      </div>

      <div className="form-group">
        <label className="form-label">{tr('Default Invoice Print Format', 'بل کی ڈیفالٹ پرنٹ فارمیٹ')}</label>
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <FormatOption
            value="a4"
            icon={FileText}
            title={tr('A4 Full Page', 'اے فور فُل پیج')}
            subtitle={tr('Office printer bill', 'آفس پرنٹر بل')}
          />
          <FormatOption
            value="thermal"
            icon={Receipt}
            title={tr('80mm Thermal', '80 ملی میٹر تھرمل')}
            subtitle={tr('POS counter slip', 'کاؤنٹر رسید')}
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
        <div className="form-group">
          <label className="form-label">{tr('Receipt Header Title', 'رسید کا عنوان')}</label>
          <input
            type="text"
            className="form-control"
            value={formData.receiptHeader || ''}
            onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{tr('Receipt Footer Message / Terms', 'رسید کے آخر میں پیغام / شرائط')}</label>
          <textarea
            className="form-control"
            rows={2}
            value={formData.receiptFooter || ''}
            onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
          />
        </div>
      </div>

      <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setIsTestPrintOpen(true)}>
          <Printer size={16} /> {tr('Test 80mm Print', '80mm ٹیسٹ پرنٹ')}
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave}>
          <Printer size={16} /> {tr('Save Print Settings', 'پرنٹ ترتیبات محفوظ کریں')}
        </button>
      </div>

      {isTestPrintOpen && (
        <ThermalReceiptModal
          isOpen={isTestPrintOpen}
          onClose={() => setIsTestPrintOpen(false)}
          invoice={sampleTestInvoice}
          settings={formData}
        />
      )}
    </div>
  );
}

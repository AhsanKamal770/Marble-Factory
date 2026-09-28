import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Printer,
  Database,
  Save,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertTriangle
} from 'lucide-react';
import { db } from '../db/index';
import { exportDatabaseToJson, importDatabaseFromJson, resetDatabaseToClean, resetDatabaseWithSampleData } from '../db/backupService';
import ThermalReceiptModal from '../components/ThermalReceiptModal';

export default function SettingsView({ settings, onSettingsUpdated }) {
  const [formData, setFormData] = useState({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isTestPrintOpen, setIsTestPrintOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const all = await db.settings.toArray();
      if (all.length > 0) {
        await db.settings.update(all[0].id, formData);
      } else {
        await db.settings.add(formData);
      }
      setSaveSuccess(true);
      if (onSettingsUpdated) onSettingsUpdated(formData);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await exportDatabaseToJson();
      if (res.success) {
        setBackupMsg('Database backup exported successfully!');
        setTimeout(() => setBackupMsg(''), 4000);
      }
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const res = await importDatabaseFromJson(content);
        if (res.success) {
          alert('Database restored successfully! Reloading...');
          window.location.reload();
        } else {
          setRestoreError(res.error || 'Invalid backup file');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetClean = async () => {
    if (!window.confirm('Kiya aap tamam records (Bills, Customers, Stock, Expenses) saaf kar ke bilkul Clean Working Database karna chahte hain?')) {
      return;
    }
    await resetDatabaseToClean();
    alert('Database bilkul clean aur empty kar di gayi hai! Reloading...');
    window.location.reload();
  };

  const handleResetSampleData = async () => {
    if (!window.confirm('Reset database to sample demo data for testing?')) {
      return;
    }
    await resetDatabaseWithSampleData();
    alert('Sample test data loaded. Reloading...');
    window.location.reload();
  };

  const sampleTestInvoice = {
    invoiceNo: "TEST-SLIP-01",
    date: new Date().toISOString(),
    customerName: "Test Thermal Customer",
    customerPhone: "0300-1234567",
    items: [
      {
        name: "Ziarat White Super Slab",
        dimensions: "5.5ft x 3.0ft (10 Slabs)",
        totalSqFt: 165,
        ratePerSqFt: 380,
        amount: 62700
      },
      {
        name: "Jet Black Granite",
        dimensions: "8.0ft x 3.0ft (2 Slabs)",
        totalSqFt: 48,
        ratePerSqFt: 650,
        amount: 31200
      }
    ],
    subtotal: 93900,
    carriageCharges: 2500,
    labourCharges: 1500,
    discountAmount: 1900,
    grandTotal: 96000,
    paidAmount: 60000,
    balanceDue: 36000,
    paymentStatus: "Half Paid",
    paymentMethod: "Cash",
    notes: "Thermal printer alignment test voucher."
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
      {/* Factory Profile & Receipt Template */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Building size={18} className="text-gold" /> Factory & Company Profile
          </h3>
          {saveSuccess && (
            <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} /> Settings Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Factory / Company Name *</label>
            <input
              type="text"
              required
              className="form-control"
              value={formData.companyName || ''}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tagline / Subtitle</label>
            <input
              type="text"
              className="form-control"
              value={formData.tagline || ''}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Primary Phone # *</label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Secondary Mobile #</label>
              <input
                type="text"
                className="form-control"
                value={formData.phoneSecondary || ''}
                onChange={(e) => setFormData({ ...formData, phoneSecondary: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Factory Yard / Showroom Address</label>
            <input
              type="text"
              className="form-control"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">City / Region</label>
              <input
                type="text"
                className="form-control"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">NTN / Tax Registration #</label>
              <input
                type="text"
                className="form-control font-mono"
                value={formData.ntnNo || ''}
                onChange={(e) => setFormData({ ...formData, ntnNo: e.target.value })}
              />
            </div>
          </div>

          {/* Cash Drawer Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Default Subah Ka Opening Cash (Rs.)</label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={formData.openingCashBalance !== undefined ? formData.openingCashBalance : 0}
                onChange={(e) => setFormData({ ...formData, openingCashBalance: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Default Sales Tax / GST (%)</label>
              <input
                type="number"
                min="0"
                className="form-control font-mono"
                value={formData.defaultTaxPercent !== undefined ? formData.defaultTaxPercent : 0}
                onChange={(e) => setFormData({ ...formData, defaultTaxPercent: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* 80mm Thermal Receipt Options */}
          <div style={{ borderTop: '1px solid #242f47', paddingTop: '16px', marginTop: '16px' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={15} /> 80mm Thermal POS Receipt Template
            </h4>

            <div className="form-group">
              <label className="form-label">Receipt Header Title</label>
              <input
                type="text"
                className="form-control"
                value={formData.receiptHeader || ''}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Receipt Footer Message / Terms</label>
              <textarea
                className="form-control"
                rows={2}
                value={formData.receiptFooter || ''}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTestPrintOpen(true)}
            >
              <Printer size={16} /> Test 80mm Print
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Factory Settings
            </button>
          </div>
        </form>
      </div>

      {/* Database Backup & Maintenance Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Database size={18} className="text-gold" /> Database Backup & Safety
            </h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
            All marble stock, sales invoices, customer ledgers, and supplier accounts are securely stored in your offline desktop database.
          </p>

          {backupMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#34d399', marginBottom: '14px', fontSize: '0.88rem' }}>
              {backupMsg}
            </div>
          )}

          {restoreError && (
            <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#fb7185', marginBottom: '14px', fontSize: '0.88rem' }}>
              {restoreError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Export JSON */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
              onClick={handleExportBackup}
            >
              <Download size={18} className="text-emerald" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#fff' }}>Export Full Database Backup (JSON)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Download local snapshot of all factory records</div>
              </div>
            </button>

            {/* Import JSON */}
            <label
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px 16px', cursor: 'pointer' }}
            >
              <Upload size={18} className="text-blue" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: '#fff' }}>Restore Database from JSON File</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Select and restore a previous backup file</div>
              </div>
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
            </label>

            {/* Wipe to Clean Database */}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ justifyContent: 'flex-start', padding: '12px 16px', color: '#fb7185', border: '1px dashed rgba(244, 63, 94, 0.4)' }}
              onClick={handleResetClean}
            >
              <RotateCcw size={18} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>Clean Working Database (Zero Records)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Wipes all dummy data and starts fresh for live factory use</div>
              </div>
            </button>

            {/* Load Sample Demo Data */}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ justifyContent: 'flex-start', padding: '12px 16px', color: 'var(--accent-blue)', border: '1px dashed rgba(37, 99, 235, 0.4)' }}
              onClick={handleResetSampleData}
            >
              <RotateCcw size={18} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700 }}>Load Sample Demo Data (Testing)</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Loads sample marble slabs and customer demo records</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Test 80mm Print Modal */}
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

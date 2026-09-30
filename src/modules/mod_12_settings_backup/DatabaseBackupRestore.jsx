import React, { useState, useRef } from 'react';
import { Database, Download, Upload, RotateCcw, AlertTriangle, Trash2, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  exportDatabaseToJson,
  importDatabaseFromJson,
  resetDatabaseToClean,
  loadTestingData
} from '../../db/backupService';

export default function DatabaseBackupRestore() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [backupMsg, setBackupMsg] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const handleExportBackup = async () => {
    setBusy(true);
    setRestoreError('');
    try {
      const res = await exportDatabaseToJson();
      if (res.success) {
        setBackupMsg(tr('Database backup exported successfully!', 'ڈیٹا بیس بیک اپ کامیابی سے محفوظ ہو گیا!'));
        setTimeout(() => setBackupMsg(''), 4000);
      }
    } catch (err) {
      alert(tr('Export failed: ', 'برآمد ناکام: ') + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError('');

    const confirmMsg = tr(
      'Restoring a backup will REPLACE all current data in the app. Continue?',
      'بیک اپ بحال کرنے سے موجودہ تمام ڈیٹا تبدیل ہو جائے گا۔ جاری رکھیں؟'
    );
    if (!window.confirm(confirmMsg)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setBusy(true);
        try {
          const res = await importDatabaseFromJson(content);
          if (res.success) {
            alert(tr('Database restored successfully! Reloading...', 'ڈیٹا بیس کامیابی سے بحال ہو گیا! دوبارہ لوڈ ہو رہا ہے...'));
            window.location.reload();
          } else {
            setRestoreError(res.error || tr('Invalid backup file', 'غلط بیک اپ فائل'));
          }
        } catch (err) {
          setRestoreError(err.message || tr('Invalid backup file', 'غلط بیک اپ فائل'));
        } finally {
          setBusy(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCleanDatabase = async () => {
    const confirmMsg = tr(
      'WARNING: Are you sure you want to WIPE all stock, sales invoices, customer ledgers, and transactions? The database will become 100% clean and empty for real factory use.',
      'انتباہ: کیا آپ تمام سٹاک، سیلز بل، گاہک کھاتے اور لین دین ختم کرنا چاہتے ہیں؟ فیکٹری کے اصلی کام کے لیے ڈیٹا بیس مکمل طور پر خالی ہو جائے گا۔'
    );
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await resetDatabaseToClean();
      alert(tr('Database completely cleaned. Reloading...', 'تمام ڈمی ڈیٹا ختم ہو گیا اور ڈیٹا بیس صاف ہو گیا۔ دوبارہ لوڈ ہو رہا ہے...'));
      window.location.reload();
    } catch (err) {
      alert(tr('Error cleaning database: ', 'ڈیٹا بیس صاف کرنے میں خرابی: ') + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadTestingData = async () => {
    const confirmMsg = tr(
      'Load sample marble inventory, customers, suppliers, and demo records for testing/training purposes?',
      'کیا آپ ٹیسٹنگ اور پریکٹس کے لیے نمونہ ماربل سٹاک، گاہک اور سپلائر کا ڈیٹا لوڈ کرنا چاہتے ہیں؟'
    );
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await loadTestingData();
      alert(tr('Sample testing data loaded successfully! Reloading...', 'ٹیسٹنگ نمونہ ڈیٹا کامیابی سے لوڈ ہو گیا۔ دوبارہ لوڈ ہو رہا ہے...'));
      window.location.reload();
    } catch (err) {
      alert(tr('Error loading sample data: ', 'ٹیسٹنگ ڈیٹا لوڈ کرنے میں خرابی: ') + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Database size={18} className="text-gold" /> {tr('Database Backup & Safety', 'ڈیٹا بیس بیک اپ و حفاظت')}
        </h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        {tr(
          'All marble stock, sales invoices, customer ledgers, payroll and Zakat records are securely stored in your offline device database.',
          'تمام سٹاک، سیلز بل، گاہک کھاتے، تنخواہیں اور زکوٰۃ کا ریکارڈ آپ کے آفلائن ڈیوائس ڈیٹا بیس میں محفوظ ہے۔'
        )}
      </p>

      {backupMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#059669', marginBottom: '14px', fontSize: '0.88rem', fontWeight: 600 }}>
          {backupMsg}
        </div>
      )}

      {restoreError && (
        <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: '#e11d48', marginBottom: '14px', fontSize: '0.88rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{restoreError}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Export Backup */}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ justifyContent: 'flex-start', padding: '12px 16px', minHeight: '52px' }}
          onClick={handleExportBackup}
          disabled={busy}
        >
          <Download size={18} className="text-emerald" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {tr('Export Full Database Backup (JSON)', 'مکمل ڈیٹا بیس بیک اپ برآمد کریں (JSON)')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tr('Download local snapshot of all factory records', 'تمام فیکٹری ریکارڈ کا فائل ڈاؤن لوڈ کریں')}
            </div>
          </div>
        </button>

        {/* Restore Backup */}
        <label
          className="btn btn-secondary"
          style={{ justifyContent: 'flex-start', padding: '12px 16px', minHeight: '52px', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          <Upload size={18} className="text-blue" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {tr('Restore Database from JSON File', 'JSON فائل سے ڈیٹا بیس بحال کریں')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tr('Select and restore a previous backup file', 'پرانی بیک اپ فائل منتخب کر کے بحال کریں')}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} disabled={busy} />
        </label>

        {/* Load Sample Testing Data */}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ justifyContent: 'flex-start', padding: '12px 16px', minHeight: '52px', border: '1px solid rgba(37, 99, 235, 0.3)', background: 'rgba(37, 99, 235, 0.05)' }}
          onClick={handleLoadTestingData}
          disabled={busy}
        >
          <Sparkles size={18} className="text-blue" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: '#2563eb' }}>
              {tr('Load Sample Testing Data (Demo / Practice)', 'ٹیسٹنگ ڈیٹا لوڈ کریں (نمونہ ریکارڈ)')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tr('Populate sample marble varieties, customers, and suppliers for testing', 'ٹیسٹنگ کے لیے نمونہ ماربل، گاہک اور کھاتے درج کریں')}
            </div>
          </div>
        </button>

        {/* Wipe & Clean Database */}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ justifyContent: 'flex-start', padding: '12px 16px', minHeight: '52px', color: '#e11d48', border: '1px dashed rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.03)' }}
          onClick={handleCleanDatabase}
          disabled={busy}
        >
          <Trash2 size={18} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>
              {tr('Wipe All Data / Clean Database (Start Fresh)', 'تمام ڈمی ڈیٹا ختم کریں / خالی ڈیٹا بیس')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tr('Deletes all stock and invoices for real factory usage (leaves admin & settings)', 'اصلی فیکٹری استعمال کے لیے تمام ریکارڈ صاف کریں')}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

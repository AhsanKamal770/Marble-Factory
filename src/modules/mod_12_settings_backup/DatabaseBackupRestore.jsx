import React, { useState, useRef } from 'react';
import { Database, Download, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { exportDatabaseToJson, importDatabaseFromJson, resetDatabaseToDefault } from '../../db/backupService';

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

  const handleResetSampleData = async () => {
    const confirmMsg = tr(
      'Reset database to default sample marble factory data? All existing custom data will be replaced.',
      'ڈیٹا بیس کو نمونہ ڈیٹا پر ری سیٹ کریں؟ موجودہ تمام ڈیٹا ضائع ہو جائے گا۔'
    );
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await resetDatabaseToDefault();
      alert(tr('Database reset to defaults. Reloading...', 'ڈیٹا بیس ری سیٹ ہو گیا۔ دوبارہ لوڈ ہو رہا ہے...'));
      window.location.reload();
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

        <button
          type="button"
          className="btn btn-ghost"
          style={{ justifyContent: 'flex-start', padding: '12px 16px', minHeight: '52px', color: '#e11d48', border: '1px dashed rgba(244, 63, 94, 0.3)' }}
          onClick={handleResetSampleData}
          disabled={busy}
        >
          <RotateCcw size={18} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>{tr('Reset to Sample Factory Data', 'نمونہ فیکٹری ڈیٹا پر ری سیٹ کریں')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tr('Restores default marble varieties & sample accounts', 'ڈیفالٹ ماربل اقسام و نمونہ اکاؤنٹس بحال کریں')}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

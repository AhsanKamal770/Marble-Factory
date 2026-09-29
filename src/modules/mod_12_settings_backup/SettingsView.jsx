import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../db/index';
import FactoryProfileForm from './FactoryProfileForm';
import PrintTemplateSettings from './PrintTemplateSettings';
import DatabaseBackupRestore from './DatabaseBackupRestore';

export default function SettingsView({ settings, onSettingsUpdated }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [formData, setFormData] = useState({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) setFormData({ ...settings });
  }, [settings]);

  const persist = async (data) => {
    const all = await db.settings.toArray();
    if (all.length > 0) {
      await db.settings.update(all[0].id, data);
    } else {
      await db.settings.add(data);
    }
    if (onSettingsUpdated) onSettingsUpdated(data);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      await persist(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(tr('Error saving settings: ', 'ترتیبات محفوظ کرنے میں خرابی: ') + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      <div className="card no-print" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SettingsIcon size={18} className="text-gold" />
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            {tr('Factory Settings & Backup', 'فیکٹری ترتیبات و بیک اپ')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {tr('Changes here apply instantly to every bill, gate pass and printed report.', 'یہاں کی تبدیلی فوراً ہر بل، گیٹ پاس اور پرنٹ رپورٹ پر لاگو ہوگی۔')}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FactoryProfileForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            saveSuccess={saveSuccess}
          />
          <PrintTemplateSettings
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <DatabaseBackupRestore />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1.4fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

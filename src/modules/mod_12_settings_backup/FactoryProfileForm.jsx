import React from 'react';
import { Building, Check, Save } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function FactoryProfileForm({ formData, setFormData, onSave, saveSuccess }) {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const field = (key) => formData[key] || '';
  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Building size={18} className="text-gold" /> {tr('Factory & Company Profile', 'فیکٹری و کمپنی پروفائل')}
        </h3>
        {saveSuccess && (
          <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={14} /> {tr('Settings Saved!', 'محفوظ ہو گیا!')}
          </span>
        )}
      </div>

      <form onSubmit={onSave}>
        <div className="form-group">
          <label className="form-label">{tr('Factory / Company Name', 'فیکٹری / کمپنی کا نام')} *</label>
          <input
            type="text"
            required
            className="form-control"
            value={field('companyName')}
            onChange={set('companyName')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{tr('Tagline / Slogan', 'ٹیگ لائن / نعرہ')}</label>
          <input
            type="text"
            className="form-control"
            placeholder="نام ہی کافی ہے..."
            value={field('tagline')}
            onChange={set('tagline')}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">{tr('Primary Phone #', 'اہم فون نمبر')} *</label>
            <input
              type="text"
              required
              className="form-control font-mono"
              value={field('phone')}
              onChange={set('phone')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{tr('Secondary Mobile #', 'دوسرا موبائل نمبر')}</label>
            <input
              type="text"
              className="form-control font-mono"
              value={field('phoneSecondary')}
              onChange={set('phoneSecondary')}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">{tr('Proprietor 1 (Name & #)', 'مالک نمبر ۱ (نام و نمبر)')}</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rana Haji Ghulam Akbar (0300-...)"
              value={field('proprietor1')}
              onChange={set('proprietor1')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{tr('Proprietor 2 (Name & #)', 'مالک نمبر ۲ (نام و نمبر)')}</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rana Ghulam Abbas (0300-...)"
              value={field('proprietor2')}
              onChange={set('proprietor2')}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{tr('Factory Yard / Showroom Address', 'فیکٹری یارڈ / شوروم پتہ')}</label>
          <input
            type="text"
            className="form-control"
            value={field('address')}
            onChange={set('address')}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">{tr('City / Region', 'شہر / علاقہ')}</label>
            <input
              type="text"
              className="form-control"
              value={field('city')}
              onChange={set('city')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{tr('NTN / Tax Registration #', 'این ٹی این / ٹیکس رجسٹریشن نمبر')}</label>
            <input
              type="text"
              className="form-control font-mono"
              value={field('ntnNo')}
              onChange={set('ntnNo')}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{tr('Email (optional)', 'ای میل (اختیاری)')}</label>
          <input
            type="email"
            className="form-control"
            value={field('email')}
            onChange={set('email')}
          />
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> {tr('Save Factory Settings', 'ترتیبات محفوظ کریں')}
          </button>
        </div>
      </form>
    </div>
  );
}

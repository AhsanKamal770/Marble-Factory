import React from 'react';
import { Ruler } from 'lucide-react';

export const SUTAR_PRESETS = [
  { sutar: '4', label: '4 Sutar', mm: '12mm (Floor)', tag: 'Standard Floor', defSize: '12 × 12', length: 1, width: 1 },
  { sutar: '6', label: '6 Sutar', mm: '18mm', tag: 'Kitchen / Stairs Only', isKitchen: true, defSize: '12 × 12', length: 1, width: 1 },
  { sutar: '9', label: '9 Sutar', mm: '28mm (Steps)', tag: 'Heavy Steps', defSize: '12 × 12', length: 1, width: 1 },
  { sutar: '14', label: '14 Sutar', mm: '42mm (Base)', tag: 'Heavy Base', defSize: '12 × 12', length: 1, width: 1 },
  { sutar: 'custom', label: 'Custom', mm: 'User Defined', tag: 'Custom Sutar', isCustom: true, defSize: '12 × 12', length: 1, width: 1 }
];

export const MARBLE_STANDARD_SIZES = {
  '6': [
    { label: '12 × 12', sub: '1 ft × 1 ft (1 Sq.Ft)', length: 1, width: 1 },
    { label: '12 × 24', sub: '2 ft × 1 ft (2 Sq.Ft)', length: 2, width: 1 },
    { label: '12 × 36', sub: '3 ft × 1 ft (3 Sq.Ft)', length: 3, width: 1 }
  ],
  '9': [
    { label: '12 × 12', sub: '1 ft × 1 ft (1 Sq.Ft)', length: 1, width: 1 },
    { label: '12 × 24', sub: '2 ft × 1 ft (2 Sq.Ft)', length: 2, width: 1 }
  ],
  '14': [
    { label: '12 × 12', sub: '1 ft × 1 ft (1 Sq.Ft)', length: 1, width: 1 }
  ],
  'default': [
    { label: '12 × 12', sub: '1 ft × 1 ft (1 Sq.Ft)', length: 1, width: 1 },
    { label: '12 × 24', sub: '2 ft × 1 ft (2 Sq.Ft)', length: 2, width: 1 },
    { label: '6 × 12', sub: '0.5 ft × 1 ft (0.5 Sq.Ft)', length: 1, width: 0.5 },
    { label: '6 × 24', sub: '0.5 ft × 2 ft (1 Sq.Ft)', length: 2, width: 0.5 }
  ]
};

/**
 * Reusable Sutar Thickness and Dimension Presets Selector
 * Used across Stock Entry (StockSheetView, StockManagementView) and New Bill (BillingView)
 */
export default function SutarDimensionSelector({
  sutarThickness,
  isCustomSutar,
  onSutarChange,
  standardSize,
  onSizePresetSelect,
  isUrdu = false
}) {
  const currentSutarStr = String(sutarThickness || '4');
  const isCustomActive = Boolean(
    isCustomSutar ||
    (!['4', '6', '9', '14'].includes(currentSutarStr) && Boolean(sutarThickness))
  );

  const availableSizes = MARBLE_STANDARD_SIZES[currentSutarStr] || MARBLE_STANDARD_SIZES['default'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* 1. Sutar Thickness Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="app-form-label" style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Ruler size={14} style={{ color: '#2563eb' }} />
            <span>{isUrdu ? 'سوتر موٹائی (Sutar Thickness)' : 'Sutar Thickness'}</span>
            <span className="app-form-label-required">*</span>
          </label>
          {currentSutarStr === '6' && !isCustomActive && (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', background: 'rgba(217, 119, 6, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              ⚡ {isUrdu ? 'صرف کچن اور سیڑھیوں کے لیے' : 'Kitchen & Stairs Only'}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          {SUTAR_PRESETS.map(thick => {
            const isSelected = thick.isCustom
              ? isCustomActive
              : (!isCustomActive && currentSutarStr === thick.sutar);

            return (
              <button
                key={thick.sutar}
                type="button"
                onClick={() => {
                  if (thick.isCustom) {
                    onSutarChange(
                      (!['4', '6', '9', '14'].includes(currentSutarStr) && sutarThickness) ? sutarThickness : '',
                      true
                    );
                  } else {
                    onSutarChange(thick.sutar, false, thick);
                  }
                }}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#2563eb' : '#334155',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{thick.label}</div>
                <div style={{ fontSize: '0.66rem', color: thick.isKitchen ? '#d97706' : (isSelected ? '#2563eb' : '#64748b'), fontWeight: thick.isKitchen ? 700 : 500 }}>
                  {thick.isKitchen ? 'Kitchen/Stairs' : thick.mm}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Sutar Thickness Number Input */}
        {isCustomActive && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px 12px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <label style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#1e40af', whiteSpace: 'nowrap' }}>
              {isUrdu ? 'مطلوبہ سوتر موٹائی درج کریں:' : 'Enter Custom Sutar:'}
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={!['4', '6', '9', '14'].includes(currentSutarStr) ? currentSutarStr : ''}
              onChange={e => onSutarChange(e.target.value, true)}
              placeholder="e.g. 3, 5, 8, 10..."
              className="app-form-input font-mono"
              style={{ width: '130px', fontWeight: 800, height: '34px', background: '#ffffff' }}
              autoFocus
            />
            <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 700 }}>سوتر</span>
          </div>
        )}
      </div>

      {/* 2. Standard Size Preset Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="app-form-label" style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
            {isUrdu ? `${sutarThickness || 4} سوتر کے معیاری سائز` : `Standard Sizes for ${sutarThickness || 4} Sutar`}
          </label>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {isUrdu ? 'سائز لگانے کے لیے کلک کریں' : 'Click to apply dimensions'}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: availableSizes.length === 1 ? '1fr' : (availableSizes.length === 2 ? 'repeat(2, 1fr)' : (availableSizes.length === 3 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)')),
            gap: '8px'
          }}
        >
          {availableSizes.map(opt => {
            const isSelected = standardSize === opt.label;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onSizePresetSelect(opt)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#2563eb' : '#334155',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.66rem', color: isSelected ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                  {opt.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import {
  Gem,
  Grid3X3,
  Flower2,
  Ruler,
  Layers,
  ChevronDown,
  X,
  Filter,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const STOCK_TAXONOMY = {
  marble: {
    key: 'Marble',
    labelEn: 'Marble Slabs & Tiles',
    labelUr: 'ماربل و سلیب',
    icon: Gem,
    sutars: [
      {
        sutar: '4 Sutar',
        labelEn: '4 Sutar (1/2" - 12mm)',
        labelUr: '4 سوتر (12mm فلور)',
        tag: 'Standard Floor',
        sizes: ['12 × 12', '12 × 24', '6 × 12', '6 × 24']
      },
      {
        sutar: '6 Sutar',
        labelEn: '6 Sutar (3/4" - 18mm)',
        labelUr: '6 سوتر (کچن و سیڑھیاں)',
        tag: 'Kitchen & Stairs',
        sizes: ['12 × 12', '12 × 24', '12 × 36']
      },
      {
        sutar: '9 Sutar',
        labelEn: '9 Sutar (1" - 28mm)',
        labelUr: '9 سوتر (ہیوی اسٹیپس)',
        tag: 'Heavy Steps',
        sizes: ['12 × 12', '12 × 24']
      },
      {
        sutar: '14 Sutar',
        labelEn: '14 Sutar (1.5" - 44mm)',
        labelUr: '14 سوتر (ہیوی بیس)',
        tag: 'Heavy Base',
        sizes: ['12 × 12']
      }
    ]
  },
  tiles: {
    key: 'Tiles',
    labelEn: 'Tiles & Porcelain',
    labelUr: 'ٹائلز و پورسلین',
    icon: Grid3X3,
    sizes: ['12 × 24', '24 × 24', '24 × 48', '16 × 16', '12 × 36'],
    accessories: [
      { name: 'Border Strip', labelUr: 'بارڈر پٹی' },
      { name: 'Filling', labelUr: 'جوائنٹ فلنگ پاؤڈر' },
      { name: 'Spacer', labelUr: 'ٹائل سپیسر' },
      { name: 'Gola', labelUr: 'کارنر گولا' },
      { name: 'Tile Bond', labelUr: 'ٹائل بانڈ' }
    ]
  },
  flowers: {
    key: 'Flowers',
    labelEn: 'Flower Medallions',
    labelUr: 'پھول / میڈیلین',
    icon: Flower2,
    sizes: ['12 × 12', '24 × 24', '3 × 3', '4 × 4']
  },
  borders: {
    key: 'Borders',
    labelEn: 'Borders & Patti',
    labelUr: 'بارڈر و کالی پٹی',
    icon: Ruler,
    types: [
      { id: 'Standard 3 inch', labelEn: '3 inch Standard Border', labelUr: '3 انچ عام بارڈر' },
      { id: 'Standard 6 inch', labelEn: '6 inch Standard Border', labelUr: '6 انچ عام بارڈر' },
      { id: 'Kali Patti 2 inch', labelEn: '2 inch Kali Patti (Black)', labelUr: '2 انچ کالی پٹی' },
      { id: 'Kali Patti 3 inch', labelEn: '3 inch Kali Patti (Black)', labelUr: '3 انچ کالی پٹی' }
    ]
  },
  panels: {
    key: 'Panels',
    labelEn: 'Wall & Islamic Panels',
    labelUr: 'ماشاء اللہ و قرآنی پینل',
    icon: Layers,
    types: [
      { id: 'Mashallah Islamic Panels', labelEn: 'Mashallah Islamic Panels', labelUr: 'ماشاء اللہ قرآنی پینل' },
      { id: '3D Wall Panels', labelEn: '3D Wall Panels', labelUr: 'تھری ڈی وال پینل' },
      { id: 'Front Elevation Panels', labelEn: 'Front Elevation Panels', labelUr: 'فرنٹ ایلیویشن پینل' }
    ]
  }
};

/**
 * Dropdown trigger button for top filter bar
 */
export function StockCategoryDropdownTrigger({ filter, onChange }) {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';

  const displaySummary = () => {
    if (!filter || filter.type === 'ALL') return isUrdu ? 'تمام کیٹگریز' : 'All Categories';
    let text = filter.type;
    if (filter.sutar) text += ` • ${filter.sutar}`;
    if (filter.size) text += ` (${filter.size})`;
    if (filter.sub) text += ` • ${filter.sub}`;
    return text;
  };

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={filter?.type || 'ALL'}
        onChange={(e) => {
          const newType = e.target.value;
          if (newType === 'ALL') {
            onChange({ type: 'ALL', sutar: null, size: null, sub: null });
          } else {
            onChange({ type: newType, sutar: null, size: null, sub: null });
          }
        }}
        style={{
          padding: '0 32px 0 34px',
          height: '44px',
          borderRadius: '10px',
          border: '1px solid var(--border-color, #cbd5e1)',
          background: filter?.type !== 'ALL' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary, #f8fafc)',
          borderColor: filter?.type !== 'ALL' ? '#2563eb' : 'var(--border-color, #cbd5e1)',
          color: filter?.type !== 'ALL' ? '#2563eb' : 'var(--text-primary, #0f172a)',
          fontSize: '0.84rem',
          fontWeight: 700,
          outline: 'none',
          cursor: 'pointer'
        }}
        title="Filter by Stone / Item Category"
      >
        <option value="ALL">{isUrdu ? 'تمام کیٹگریز (All Types)' : 'All Categories'}</option>
        <option value="Marble">{isUrdu ? 'ماربل (Marble)' : 'Marble'}</option>
        <option value="Tiles">{isUrdu ? 'ٹائلز (Tiles)' : 'Tiles'}</option>
        <option value="Flowers">{isUrdu ? 'پھول (Flowers)' : 'Flowers'}</option>
        <option value="Borders">{isUrdu ? 'بارڈر و پٹی (Borders)' : 'Borders & Patti'}</option>
        <option value="Panels">{isUrdu ? 'پینل (Panels)' : 'Panels'}</option>
      </select>
      <Filter size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: filter?.type !== 'ALL' ? '#2563eb' : '#64748b', pointerEvents: 'none' }} />
    </div>
  );
}

/**
 * Interactive Progressive Drill-Down Card
 * Appears directly below the filter bar when a category or filter is active
 */
export function StockCategoryFilterCard({ filter, onChange, totalMatches = 0 }) {
  const { language } = useLanguage();
  const isUrdu = language === 'ur';

  if (!filter || filter.type === 'ALL') {
    return null;
  }

  const activeType = filter.type;
  const activeSutar = filter.sutar;
  const activeSize = filter.size;
  const activeSub = filter.sub;

  const handleSetSutar = (sutarVal) => {
    if (activeSutar === sutarVal) {
      // Toggle off sutar
      onChange({ ...filter, sutar: null, size: null });
    } else {
      onChange({ ...filter, sutar: sutarVal, size: null });
    }
  };

  const handleSetSize = (sizeVal) => {
    if (activeSize === sizeVal) {
      onChange({ ...filter, size: null });
    } else {
      onChange({ ...filter, size: sizeVal });
    }
  };

  const handleSetSub = (subVal) => {
    if (activeSub === subVal) {
      onChange({ ...filter, sub: null });
    } else {
      onChange({ ...filter, sub: subVal });
    }
  };

  const handleClearAll = () => {
    onChange({ type: 'ALL', sutar: null, size: null, sub: null });
  };

  // Find sizes for current sutar in marble
  const currentMarbleSutarObj = activeType === 'Marble' && activeSutar
    ? STOCK_TAXONOMY.marble.sutars.find(s => s.sutar === activeSutar)
    : null;

  return (
    <div
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid #bfdbfe',
        borderRadius: '14px',
        padding: '14px 16px',
        boxShadow: '0 4px 16px rgba(37, 99, 235, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      {/* 1. Header Breadcrumb & Results Match Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            {isUrdu ? 'فعال فلٹر:' : 'Active Filter:'}
          </span>

          {/* Category Chip */}
          <span
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.80rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>{activeType}</span>
          </span>

          {/* Sutar Chip if selected */}
          {activeSutar && (
            <>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>→</span>
              <span
                style={{
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  color: '#1d4ed8',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '0.80rem',
                  fontWeight: 800
                }}
              >
                {activeSutar}
              </span>
            </>
          )}

          {/* Size Chip if selected */}
          {activeSize && (
            <>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>→</span>
              <span
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#059669',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '0.80rem',
                  fontWeight: 800
                }}
              >
                {activeSize}
              </span>
            </>
          )}

          {/* Subtype Chip if selected */}
          {activeSub && (
            <>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>→</span>
              <span
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#d97706',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '0.80rem',
                  fontWeight: 800
                }}
              >
                {activeSub}
              </span>
            </>
          )}
        </div>

        {/* Right: Results Count + Reset Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              color: '#059669',
              background: '#ecfdf5',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid #a7f3d0'
            }}
          >
            {totalMatches} {isUrdu ? 'آئٹمز دستیاب' : 'Items Matched'}
          </span>

          <button
            type="button"
            onClick={handleClearAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid #fecdd3',
              background: '#fff1f2',
              color: '#e11d48',
              fontSize: '0.76rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Clear and show all inventory"
          >
            <X size={13} />
            <span>{isUrdu ? 'فلٹر ختم کریں' : 'Reset All'}</span>
          </button>
        </div>
      </div>

      {/* 2. LEVEL 1 DRILL-DOWN: MARBLE SUTARS (4, 6, 9, 14 Sutar) */}
      {activeType === 'Marble' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>📐 {isUrdu ? 'ماربل سوتر موٹائی منتخب کریں:' : 'Select Marble Sutar Thickness:'}</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {isUrdu ? 'کلک کر کے سائز دیکھیں' : 'Click sutar to drill down to standard cut sizes'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* All Sutar Button */}
            <button
              type="button"
              onClick={() => handleSetSutar(null)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: !activeSutar ? '#2563eb' : 'var(--bg-primary, #f8fafc)',
                borderColor: !activeSutar ? '#2563eb' : 'var(--border-color, #cbd5e1)',
                color: !activeSutar ? '#ffffff' : 'var(--text-primary, #0f172a)',
                boxShadow: !activeSutar ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none'
              }}
            >
              {isUrdu ? 'تمام سوتر (All Sutar)' : 'All Sutars'}
            </button>

            {/* 4 Sutar, 6 Sutar, 9 Sutar, 14 Sutar Chips */}
            {STOCK_TAXONOMY.marble.sutars.map((st) => {
              const isSelected = activeSutar === st.sutar;
              return (
                <button
                  key={st.sutar}
                  type="button"
                  onClick={() => handleSetSutar(st.sutar)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    background: isSelected ? '#2563eb' : 'var(--bg-primary, #f8fafc)',
                    borderColor: isSelected ? '#2563eb' : 'var(--border-color, #cbd5e1)',
                    color: isSelected ? '#ffffff' : 'var(--text-primary, #0f172a)',
                    boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none'
                  }}
                >
                  <span>{st.sutar}</span>
                  <span
                    style={{
                      fontSize: '0.70rem',
                      fontWeight: 600,
                      opacity: isSelected ? 0.9 : 0.75,
                      color: isSelected ? '#dbeafe' : '#64748b'
                    }}
                  >
                    ({st.tag})
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3. LEVEL 2 DRILL-DOWN: SIZES (When 4 Sutar or other Sutar is clicked) */}
          {activeSutar && currentMarbleSutarObj && (
            <div
              style={{
                marginTop: '4px',
                padding: '10px 12px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #93c5fd',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>📏 {activeSutar} {isUrdu ? 'کے سائز فلٹر:' : 'Standard Cut Sizes:'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {/* All Sizes */}
                <button
                  type="button"
                  onClick={() => handleSetSize(null)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: !activeSize ? '#0284c7' : '#ffffff',
                    borderColor: !activeSize ? '#0284c7' : '#cbd5e1',
                    color: !activeSize ? '#ffffff' : '#334155'
                  }}
                >
                  {isUrdu ? 'تمام سائز' : 'All Sizes'}
                </button>

                {/* Specific sizes for this sutar */}
                {currentMarbleSutarObj.sizes.map((sz) => {
                  const isSzSelected = activeSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleSetSize(sz)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        border: '1px solid',
                        cursor: 'pointer',
                        background: isSzSelected ? '#0284c7' : '#ffffff',
                        borderColor: isSzSelected ? '#0284c7' : '#cbd5e1',
                        color: isSzSelected ? '#ffffff' : '#0f172a',
                        boxShadow: isSzSelected ? '0 2px 5px rgba(2, 132, 199, 0.2)' : 'none'
                      }}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. TILES DRILL-DOWN (Sizes & Accessories) */}
      {activeType === 'Tiles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Tile Sizes */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '6px' }}>
              📐 {isUrdu ? 'ٹائل سائز:' : 'Tile Standard Dimensions:'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSetSize(null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  border: '1px solid',
                  cursor: 'pointer',
                  background: !activeSize ? '#2563eb' : '#f8fafc',
                  borderColor: !activeSize ? '#2563eb' : '#cbd5e1',
                  color: !activeSize ? '#ffffff' : '#0f172a'
                }}
              >
                {isUrdu ? 'تمام سائز' : 'All Sizes'}
              </button>
              {STOCK_TAXONOMY.tiles.sizes.map((sz) => {
                const isSelected = activeSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSetSize(sz)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '7px',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: isSelected ? '#2563eb' : '#f8fafc',
                      borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                      color: isSelected ? '#ffffff' : '#0f172a'
                    }}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tile Accessories */}
          <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', marginBottom: '6px' }}>
              🧱 {isUrdu ? 'ٹائلز اضافی سامان (لوازمات):' : 'Tile Accessories & Grout:'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {STOCK_TAXONOMY.tiles.accessories.map((acc) => {
                const isSelected = activeSub === acc.name;
                return (
                  <button
                    key={acc.name}
                    type="button"
                    onClick={() => handleSetSub(acc.name)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '7px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: '1px solid',
                      cursor: 'pointer',
                      background: isSelected ? '#059669' : '#ffffff',
                      borderColor: isSelected ? '#059669' : '#cbd5e1',
                      color: isSelected ? '#ffffff' : '#0f172a'
                    }}
                  >
                    {acc.name} ({acc.labelUr})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. FLOWERS DRILL-DOWN */}
      {activeType === 'Flowers' && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '6px' }}>
            🌸 {isUrdu ? 'پھول سائز منتخب کریں:' : 'Select Flower Medallion Size:'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSetSize(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                fontSize: '0.80rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                background: !activeSize ? '#2563eb' : '#f8fafc',
                borderColor: !activeSize ? '#2563eb' : '#cbd5e1',
                color: !activeSize ? '#ffffff' : '#0f172a'
              }}
            >
              {isUrdu ? 'تمام پھول' : 'All Flowers'}
            </button>
            {STOCK_TAXONOMY.flowers.sizes.map((sz) => {
              const isSelected = activeSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleSetSize(sz)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: isSelected ? '#2563eb' : '#f8fafc',
                    borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                    color: isSelected ? '#ffffff' : '#0f172a'
                  }}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. BORDERS DRILL-DOWN */}
      {activeType === 'Borders' && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '6px' }}>
            📏 {isUrdu ? 'بارڈر اور کالی پٹی کی قسم:' : 'Border & Patti Strip Types:'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSetSub(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                fontSize: '0.80rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                background: !activeSub ? '#2563eb' : '#f8fafc',
                borderColor: !activeSub ? '#2563eb' : '#cbd5e1',
                color: !activeSub ? '#ffffff' : '#0f172a'
              }}
            >
              {isUrdu ? 'تمام بارڈرز' : 'All Borders'}
            </button>
            {STOCK_TAXONOMY.borders.types.map((tp) => {
              const isSelected = activeSub === tp.id;
              return (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => handleSetSub(tp.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: isSelected ? '#2563eb' : '#f8fafc',
                    borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                    color: isSelected ? '#ffffff' : '#0f172a'
                  }}
                >
                  {tp.labelEn} ({tp.labelUr})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. PANELS DRILL-DOWN */}
      {activeType === 'Panels' && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '6px' }}>
            ✨ {isUrdu ? 'پینل کی قسم منتخب کریں:' : 'Select Panel Type:'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSetSub(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                fontSize: '0.80rem',
                fontWeight: 700,
                border: '1px solid',
                cursor: 'pointer',
                background: !activeSub ? '#2563eb' : '#f8fafc',
                borderColor: !activeSub ? '#2563eb' : '#cbd5e1',
                color: !activeSub ? '#ffffff' : '#0f172a'
              }}
            >
              {isUrdu ? 'تمام پینلز' : 'All Panels'}
            </button>
            {STOCK_TAXONOMY.panels.types.map((tp) => {
              const isSelected = activeSub === tp.id;
              return (
                <button
                  key={tp.id}
                  type="button"
                  onClick={() => handleSetSub(tp.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    fontSize: '0.80rem',
                    fontWeight: 800,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: isSelected ? '#2563eb' : '#f8fafc',
                    borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                    color: isSelected ? '#ffffff' : '#0f172a'
                  }}
                >
                  {tp.labelEn} ({tp.labelUr})
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StockCategoryFilterCard;

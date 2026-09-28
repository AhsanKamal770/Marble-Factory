import React from 'react';

/**
 * SutarBadge — Concept: Visual Vocabulary for Thickness Classification
 *
 * In the Rana Shahab factory, "Sutar" is the local Pakistani unit for marble slab thickness.
 * The 4 Sutar classifications correspond to different use-cases:
 *   4 Sutar (≈ 0.5 in / 12mm)  → Light-duty decorative, flower medallions, borders
 *   6 Sutar (≈ 0.75 in / 18mm) → Standard flooring — Kitchen, Sidhi (Stairs), Lift lobbies
 *   9 Sutar (≈ 1.12 in / 28mm) → Heavy-duty flooring, commercial areas
 *  14 Sutar (≈ 1.75 in / 44mm) → Industrial / step & riser applications
 *
 * A badge makes the Sutar classification immediately scannable at a glance without
 * requiring the user to decode a millimetre value. This is a "domain-specific vocabulary"
 * component — it speaks the factory worker's language, not generic metric units.
 *
 * Use: <SutarBadge sutar="6" />  or  <SutarBadge sutar={item.sutarThickness} />
 */

const SUTAR_CONFIG = {
  '4': {
    label: '4 Sutar',
    subLabel: '12mm',
    bg: 'rgba(168, 85, 247, 0.12)',
    color: '#a855f7',
    border: 'rgba(168, 85, 247, 0.3)',
  },
  '6': {
    label: '6 Sutar',
    subLabel: 'Kitchen / Stairs',
    bg: 'rgba(37, 99, 235, 0.10)',
    color: '#2563eb',
    border: 'rgba(37, 99, 235, 0.25)',
  },
  '9': {
    label: '9 Sutar',
    subLabel: '28mm',
    bg: 'rgba(16, 185, 129, 0.10)',
    color: '#059669',
    border: 'rgba(16, 185, 129, 0.25)',
  },
  '14': {
    label: '14 Sutar',
    subLabel: 'Heavy Duty',
    bg: 'rgba(234, 88, 12, 0.10)',
    color: '#ea580c',
    border: 'rgba(234, 88, 12, 0.25)',
  },
};

export default function SutarBadge({ sutar, showSubLabel = false, size = 'sm' }) {
  if (!sutar) return null;

  const key = String(sutar);
  const config = SUTAR_CONFIG[key];

  if (!config) {
    // Fallback for custom thickness values (e.g. thicknessMm stored directly)
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '2px 7px' : '4px 10px',
        borderRadius: '20px',
        background: 'rgba(100, 116, 139, 0.1)',
        border: '1px solid rgba(100, 116, 139, 0.2)',
        color: '#64748b',
        fontSize: size === 'sm' ? '0.68rem' : '0.76rem',
        fontWeight: 700,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}>
        {key} Sutar
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      flexDirection: showSubLabel ? 'column' : 'row',
      alignItems: showSubLabel ? 'flex-start' : 'center',
      gap: '2px',
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: '20px',
      background: config.bg,
      border: `1px solid ${config.border}`,
      color: config.color,
      fontSize: size === 'sm' ? '0.7rem' : '0.78rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      lineHeight: 1.3,
    }}>
      {config.label}
      {showSubLabel && (
        <span style={{ fontSize: '0.62rem', fontWeight: 500, opacity: 0.8 }}>
          {config.subLabel}
        </span>
      )}
      {!showSubLabel && config.subLabel && key === '6' && (
        <span style={{ fontSize: '0.62rem', fontWeight: 500, marginLeft: '3px', opacity: 0.75 }}>
          [{config.subLabel}]
        </span>
      )}
    </span>
  );
}

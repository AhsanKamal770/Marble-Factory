import React from 'react';

export default function Logo({ width = 120, height = 60, className = '', style = {} }) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 160 90" 
      className={className} 
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="peakNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a2540" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="facetSlate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Outer base silhouette / shadow */}
      <polygon points="80,10 138,76 22,76" fill="#0f172a" opacity="0.05" />

      {/* Main Backing Peak Facets */}
      <polygon points="80,10 135,74 80,74" fill="url(#peakNavy)" />
      <polygon points="80,10 25,74 80,74" fill="#1e293b" />

      {/* Geometric Cutouts / Snow Caps & Marble Veins */}
      {/* Top Left Snow Cap */}
      <polygon points="80,10 60,38 80,48" fill="#ffffff" />
      {/* Top Right Snow / Light Accent */}
      <polygon points="80,10 102,38 80,48" fill="#e2e8f0" />
      
      {/* Middle Facet Left */}
      <polygon points="60,38 42,60 68,54" fill="#94a3b8" />
      {/* Middle White Crystal */}
      <polygon points="68,54 80,48 94,62 76,74" fill="#ffffff" />
      {/* Middle Right Slate Blue Facet */}
      <polygon points="102,38 120,62 94,54" fill="url(#facetSlate)" />
      {/* Right White Accent */}
      <polygon points="94,54 116,74 94,74" fill="#f8fafc" />

      {/* Left Low Peak */}
      <polygon points="42,60 25,74 54,74" fill="#334155" />
      <polygon points="42,60 54,74 68,54" fill="#f1f5f9" />

      {/* Right Low Peak */}
      <polygon points="120,62 135,74 108,74" fill="#1e3a8a" />
    </svg>
  );
}


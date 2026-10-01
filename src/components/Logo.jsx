import React from 'react';

export default function Logo({ width = 120, height = 60, className = '', style = {} }) {
  return (
    <img 
      src="/logo@2x.png" 
      alt="Rana Shahab Marble Logo"
      width={width}
      height={height}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style
      }}
    />
  );
}


import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  size = 'md', // 'sm' (400px), 'md' (500px), 'lg' (700px)
  footerActions
}) {
  const [show, setShow] = useState(false);

  // Map size to standard maxWidth
  const sizeMap = {
    sm: '400px',
    md: '520px',
    lg: '700px'
  };
  const computedMaxWidth = sizeMap[size] || sizeMap.md;

  useEffect(() => {
    let timeoutId;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Slight delay to ensure DOM is ready for CSS transition
      timeoutId = setTimeout(() => setShow(true), 10);
    } else {
      setShow(false);
      timeoutId = setTimeout(() => {
        document.body.style.overflow = 'auto';
      }, 200); // Wait for transition
    }
    return () => {
      clearTimeout(timeoutId);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen && !show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      opacity: show ? 1 : 0,
      transition: 'opacity 0.2s ease',
      padding: '20px'
    }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))",
        backdropFilter: "blur(20px)",
        borderRadius: '20px',
        width: '100%',
        maxWidth: computedMaxWidth,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5) inset",
        border: "1px solid rgba(255,255,255,0.8)",
        transform: show ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {Icon && (
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(37, 99, 235, 0.05))',
                color: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(37, 99, 235, 0.1)'
              }}>
                <Icon size={20} />
              </div>
            )}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '24px', 
          overflowY: 'auto', 
          flex: 1,
          fontSize: '0.88rem',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
          background: 'transparent'
        }}>
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            background: 'rgba(255, 255, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}

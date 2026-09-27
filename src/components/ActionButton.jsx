import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

/**
 * ActionButton - Production Design System Action Button
 * 
 * Enforces uniform dimensions across all dashboard actions:
 * - Fixed height: 48px
 * - Border-radius: 10px
 * - Consistent vertical padding: 0 18px
 * - Explicit borders: 1px solid #D8E0EA for secondary, 1px solid #2563eb for primary
 * - Unified typography (14px/0.88rem, font-weight 700)
 * - Exact icon dimensions (18px x 18px with 8px gap)
 */
export default function ActionButton({
  variant = 'secondary', // 'primary' | 'secondary' | 'success' | 'danger'
  icon: Icon,
  iconColor,
  children,
  onClick,
  disabled = false,
  type = 'button',
  title,
  className = '',
  style = {},
  ...props
}) {
  const isPrimary = variant === 'primary';
  const isSuccess = variant === 'success';
  const isDanger = variant === 'danger';

  // Base homogeneous dimensions and layout
  const baseStyle = {
    height: '48px',
    padding: '0 18px',
    borderRadius: '10px',
    fontSize: '0.86rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
    transition: 'background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.15s ease',
    opacity: disabled ? 0.6 : 1,
    outline: 'none',
    ...style
  };

  // Specific visual priority variants
  let variantStyle = {};
  if (isPrimary) {
    variantStyle = {
      backgroundColor: '#2563eb',
      border: '1px solid #2563eb',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.15)'
    };
  } else if (isSuccess) {
    variantStyle = {
      backgroundColor: '#059669',
      border: '1px solid #059669',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.15)'
    };
  } else if (isDanger) {
    variantStyle = {
      backgroundColor: '#dc2626',
      border: '1px solid #dc2626',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.15)'
    };
  } else {
    // Secondary action (White surface with visible gray border)
    variantStyle = {
      backgroundColor: '#ffffff',
      border: '1px solid #D8E0EA',
      color: '#0f172a',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
    };
  }

  // Resolved icon color
  const resolvedIconColor = iconColor || (isPrimary || isSuccess || isDanger ? '#ffffff' : 'var(--text-secondary, #475569)');

  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`action-btn action-btn-${variant} ${className}`}
      style={{ ...baseStyle, ...variantStyle }}
      {...props}
    >
      {Icon && (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {React.isValidElement(Icon) ? Icon : <Icon size={18} style={{ color: resolvedIconColor }} />}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}

/**
 * ActionGroup - Responsive container for dashboard action buttons
 * 
 * - Desktop/Tablet: Renders all action buttons with a clean 10px gap.
 * - Mobile (<680px): Keeps the primary CTA prominent and collapses secondary
 *   actions into an accessible "More actions ▾" popover.
 */
export function ActionGroup({
  primaryAction,
  secondaryActions = [],
  language = 'en',
  style = {}
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="action-btn-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', position: 'relative', ...style }}>
      {/* Desktop / Tablet: Render all actions */}
      <div className="action-group-desktop" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {secondaryActions.map((action, idx) => (
          <ActionButton
            key={idx}
            variant="secondary"
            icon={action.icon}
            iconColor={action.iconColor}
            onClick={action.onClick}
            title={action.title}
          >
            {action.label}
          </ActionButton>
        ))}

        {primaryAction && (
          <ActionButton
            variant="primary"
            icon={primaryAction.icon}
            onClick={primaryAction.onClick}
            title={primaryAction.title}
          >
            {primaryAction.label}
          </ActionButton>
        )}
      </div>

      {/* Mobile (<680px): Primary CTA + "More actions ▾" dropdown */}
      <div className="action-group-mobile" ref={menuRef} style={{ display: 'none', alignItems: 'center', gap: '8px', width: '100%' }}>
        {primaryAction && (
          <div style={{ flex: 1 }}>
            <ActionButton
              variant="primary"
              icon={primaryAction.icon}
              onClick={primaryAction.onClick}
              title={primaryAction.title}
              style={{ width: '100%' }}
            >
              {primaryAction.label}
            </ActionButton>
          </div>
        )}

        {secondaryActions.length > 0 && (
          <div style={{ position: 'relative' }}>
            <ActionButton
              variant="secondary"
              icon={ChevronDown}
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              title={language === 'ur' ? 'مزید کارروائیاں' : 'More actions'}
              style={{ padding: '0 14px' }}
            >
              {language === 'ur' ? 'مزید' : 'More'}
            </ActionButton>

            {isMobileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '54px',
                  right: language === 'ur' ? 'auto' : 0,
                  left: language === 'ur' ? 0 : 'auto',
                  background: '#ffffff',
                  border: '1px solid #D8E0EA',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  minWidth: '220px',
                  overflow: 'hidden',
                  padding: '6px'
                }}
              >
                {secondaryActions.map((action, idx) => {
                  const SubIcon = action.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        action.onClick();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'pointer',
                        textAlign: language === 'ur' ? 'right' : 'left',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {SubIcon && (
                        <span style={{ color: action.iconColor || '#475569', display: 'flex', alignItems: 'center' }}>
                          <SubIcon size={16} />
                        </span>
                      )}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

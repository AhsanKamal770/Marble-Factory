import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Globe,
  ShieldCheck,
  Minus,
  Square,
  X,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Logo from '../components/Logo';

export default function LoginView({ onLoginSuccess, settings }) {
  const { language, toggleLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // Required credentials: admin / admin
      if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
        if (rememberMe) {
          localStorage.setItem('marble_auth', JSON.stringify({ user: 'admin', role: 'Administrator', loginTime: new Date().toISOString() }));
        } else {
          sessionStorage.setItem('marble_auth', JSON.stringify({ user: 'admin', role: 'Administrator', loginTime: new Date().toISOString() }));
        }
        onLoginSuccess({ user: 'admin', role: 'Administrator' });
      } else {
        setError(
          language === 'ur'
            ? 'غلط یوزر نام یا پاس ورڈ! برائے مہربانی "admin" لکھیں۔'
            : 'Invalid credentials! Enter username "admin" and password "admin".'
        );
        setLoading(false);
      }
    }, 250);
  };

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('admin');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundImage: `url('/background.jpeg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '24px 16px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* 1. TOP-RIGHT WINDOW CONTROLS (Pixel-matched to reference frame) */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        zIndex: 25
      }}>
        <button
          type="button"
          onClick={() => window.electronAPI?.minimizeApp?.()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          title="Minimize"
        >
          <Minus size={15} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (window.electronAPI?.maximizeApp) {
              window.electronAPI.maximizeApp();
            } else if (document.fullscreenElement) {
              document.exitFullscreen?.();
            } else {
              document.documentElement.requestFullscreen?.();
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          title="Maximize"
        >
          <Square size={13} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          onClick={() => window.electronAPI?.closeApp?.()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#e11d48';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#334155';
          }}
          title="Close"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      {/* 2. MAIN CENTER CONTENT CONTAINER */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '470px',
        zIndex: 10,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* BRANDING HEADER (MATCHING REFERENCE IMAGE) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          {/* Exact Logo from reference picture */}
          <div style={{
            marginBottom: '4px',
            filter: 'drop-shadow(0 4px 10px rgba(14, 38, 70, 0.08))'
          }}>
            <Logo width={130} height={70} />
          </div>

          {/* Main Title: Rana Shahab Marble */}
          <h1 style={{
            fontSize: '1.95rem',
            fontWeight: 800,
            color: '#0e2646',
            margin: '6px 0 3px',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            Rana Shahab Marble
          </h1>

          {/* Subtitle: FACTORY MANAGEMENT SYSTEM */}
          <h2 style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#475569',
            margin: '0 0 7px',
            letterSpacing: '2.4px',
            textTransform: 'uppercase'
          }}>
            FACTORY MANAGEMENT SYSTEM
          </h2>

          {/* Tagline */}
          <p style={{
            fontSize: '0.78rem',
            fontWeight: 500,
            color: '#64748b',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            letterSpacing: '0.15px'
          }}>
            <span>Better Management</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>Smarter Operations</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>Higher Growth</span>
          </p>
        </div>

        {/* 3. LOGIN FORM CARD (CLEAN WHITE FLOATING BOX) */}
        <div style={{
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '38px 36px 30px',
          boxShadow: '0 20px 50px -10px rgba(15, 35, 65, 0.12), 0 4px 16px rgba(15, 35, 65, 0.04)',
          border: '1px solid rgba(226, 232, 240, 0.75)',
          boxSizing: 'border-box'
        }}>
          {/* Card Headings */}
          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <h3
              onClick={handleQuickFill}
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 6px',
                letterSpacing: '-0.015em',
                cursor: 'pointer'
              }}
              title="Click to fill demo credentials"
            >
              {language === 'ur' ? 'خوش آمدید' : 'Welcome Back'}
            </h3>
            <p style={{
              fontSize: '0.86rem',
              color: '#64748b',
              margin: 0
            }}>
              {language === 'ur' ? 'جاری رکھنے کے لیے لاگ ان کریں' : 'Please sign in to your account to continue'}
            </p>
          </div>

          {/* Auto-Fill Quick Chip (For Fast Testing) */}
          <div
            onClick={handleQuickFill}
            style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '8px 14px',
              marginBottom: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#0f4880';
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#f8fafc';
            }}
            title="Click to auto-fill admin credentials"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} style={{ color: '#0f4880' }} />
              <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                Demo: <strong style={{ color: '#0f4880' }}>admin</strong> / <strong style={{ color: '#0f4880' }}>admin</strong>
              </span>
            </div>
            <span style={{
              fontSize: '0.7rem',
              background: '#0f4880',
              color: '#ffffff',
              padding: '3px 9px',
              borderRadius: '6px',
              fontWeight: 700,
              letterSpacing: '0.2px'
            }}>
              {language === 'ur' ? 'آٹو فل' : 'Auto Fill'}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '12px',
              color: '#be123c',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              fontWeight: 500
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit}>
            {/* Username Input */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <User
                  size={19}
                  strokeWidth={1.8}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    color: '#64748b',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  required
                  placeholder={language === 'ur' ? 'یوزر نام درج کریں (e.g. admin)' : 'Enter username (e.g. admin)'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    height: '52px',
                    paddingLeft: '48px',
                    paddingRight: '16px',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '14px',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0f4880';
                    e.target.style.boxShadow = '0 0 0 3px rgba(15, 72, 128, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Lock
                  size={19}
                  strokeWidth={1.8}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    color: '#64748b',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={language === 'ur' ? 'پاس ورڈ درج کریں (e.g. admin)' : 'Enter password (e.g. admin)'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '52px',
                    paddingLeft: '48px',
                    paddingRight: '48px',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '14px',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0f4880';
                    e.target.style.boxShadow = '0 0 0 3px rgba(15, 72, 128, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#0f172a'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} strokeWidth={1.8} /> : <Eye size={19} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              fontSize: '0.85rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                cursor: 'pointer',
                color: '#334155',
                fontWeight: 500,
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '17px',
                    height: '17px',
                    accentColor: '#0f4c8a',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                />
                <span>{language === 'ur' ? 'لاگ ان یاد رکھیں' : 'Remember login'}</span>
              </label>

              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  handleQuickFill();
                }}
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.84rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {language === 'ur' ? 'پاس ورڈ بھول گئے؟' : 'Forgot password?'}
              </a>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                background: loading ? '#64748b' : '#0f4880',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(15, 72, 128, 0.28)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#0a3560')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#0f4880')}
            >
              {loading ? (
                <span>{language === 'ur' ? 'لاگ ان ہو رہا ہے...' : 'Signing in...'}</span>
              ) : (
                <>
                  <LogIn size={19} strokeWidth={2} />
                  <span>{language === 'ur' ? 'لاگ ان کریں' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Secure Access Footer inside Card */}
          <div style={{
            marginTop: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: '#64748b',
            fontWeight: 500
          }}>
            <ShieldCheck size={15} strokeWidth={1.8} style={{ color: '#0f4880' }} />
            <span>Secure Access &bull; Marble Factory Management System</span>
          </div>
        </div>
      </div>

      {/* Discrete Language Switcher (Bottom Right) */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '20px',
        zIndex: 20
      }}>
        <button
          type="button"
          onClick={toggleLanguage}
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '16px',
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#ffffff'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'}
          title="Switch Language (اردو / English)"
        >
          <Globe size={13} style={{ color: '#0f4880' }} />
          <span>{language === 'en' ? 'اردو' : 'English'}</span>
        </button>
      </div>
    </div>
  );
}

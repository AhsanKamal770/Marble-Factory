import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Logo from '../components/Logo';

export default function LoginView({ onLoginSuccess, settings, theme, toggleTheme }) {
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
    }, 300);
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin');
    setError('');
  };

  const companyName = settings?.companyName || 'Rana Shahab Marble';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundImage: `url('./background.jpeg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: "'Segoe UI', Roboto, Inter, -apple-system, sans-serif",
      padding: '24px 16px',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      {/* Top Corner Quick Language & Theme Controls */}
      <div style={{
        position: 'absolute',
        top: '18px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: 20
      }}>
        <button
          type="button"
          onClick={toggleLanguage}
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(203, 213, 225, 0.8)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#1e293b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          title={language === 'en' ? 'اردو میں تبدیل کریں' : 'Switch to English'}
        >
          <Globe size={15} style={{ color: '#0f3b73' }} />
          <span>{language === 'en' ? 'اردو' : 'English'}</span>
        </button>

        {toggleTheme && (
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(203, 213, 225, 0.8)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e293b',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} style={{ color: '#d97706' }} />}
          </button>
        )}
      </div>

      {/* Main Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '460px',
        zIndex: 10,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>

        {/* 1. TOP BRANDING (OUTSIDE AND ABOVE THE FORM CARD) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          {/* Mountain Logo */}
          <div style={{
            marginBottom: '4px',
            filter: 'drop-shadow(0 4px 10px rgba(15, 42, 69, 0.12))'
          }}>
            <Logo width={120} height={60} />
          </div>

          {/* Main Factory Name */}
          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#0f2a4a',
            margin: '6px 0 3px',
            letterSpacing: '-0.01em',
            lineHeight: 1.15
          }}>
            {companyName}
          </h1>

          {/* Subtitle */}
          <h2 style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#475569',
            margin: '0 0 5px',
            letterSpacing: '2px',
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
            gap: '8px',
            letterSpacing: '0.2px'
          }}>
            <span>Better Management</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>Smarter Operations</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>Higher Growth</span>
          </p>
        </div>

        {/* 2. LOGIN FORM CARD (WHITE FLOATING MODERN BOX) */}
        <div style={{
          width: '100%',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '34px 32px 28px',
          boxShadow: '0 20px 45px rgba(15, 35, 60, 0.12), 0 4px 12px rgba(15, 35, 60, 0.05)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxSizing: 'border-box'
        }}>
          {/* Card Heading */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h3 style={{
              fontSize: '1.45rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 5px',
              letterSpacing: '-0.01em'
            }}>
              {language === 'ur' ? 'خوش آمدید' : 'Welcome Back'}
            </h3>
            <p style={{
              fontSize: '0.84rem',
              color: '#64748b',
              margin: 0
            }}>
              {language === 'ur' ? 'جاری رکھنے کے لیے لاگ ان کریں' : 'Please sign in to your account to continue'}
            </p>
          </div>

          {/* Auto-Fill Quick Chip (For Fast Testing) */}
          <div
            onClick={handleFillDemo}
            style={{
              background: '#f1f5f9',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '6px 12px',
              marginBottom: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
            title="Click to auto-fill admin credentials"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} style={{ color: '#0f3b73' }} />
              <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                Demo: <strong style={{ color: '#0f3b73' }}>admin</strong> / <strong style={{ color: '#0f3b73' }}>admin</strong>
              </span>
            </div>
            <span style={{
              fontSize: '0.68rem',
              background: '#0f3b73',
              color: '#ffffff',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 700
            }}>
              {language === 'ur' ? 'آٹو فل' : 'Auto Fill'}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '10px 12px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '10px',
              color: '#be123c',
              marginBottom: '16px',
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Username Input */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
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
                    height: '46px',
                    paddingLeft: '44px',
                    paddingRight: '14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0f3b73';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(15, 59, 115, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.backgroundColor = '#f8fafc';
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
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
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
                    height: '46px',
                    paddingLeft: '44px',
                    paddingRight: '44px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0f3b73';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(15, 59, 115, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.backgroundColor = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '22px',
              fontSize: '0.84rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: '#334155',
                fontWeight: 500
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#0f3b73',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                />
                <span>{language === 'ur' ? 'لاگ ان یاد رکھیں' : 'Remember login'}</span>
              </label>

              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem'
                }}
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
                height: '46px',
                background: loading ? '#64748b' : '#0f3b73',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.98rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(15, 59, 115, 0.35)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#09254c')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.background = '#0f3b73')}
            >
              {loading ? (
                <span>{language === 'ur' ? 'لاگ ان ہو رہا ہے...' : 'Signing in...'}</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>{language === 'ur' ? 'لاگ ان کریں' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Secure Access Footer inside Card */}
          <div style={{
            marginTop: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            color: '#64748b',
            fontWeight: 500
          }}>
            <ShieldCheck size={14} style={{ color: '#0f3b73' }} />
            <span>Secure Access &bull; Marble Factory Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
}


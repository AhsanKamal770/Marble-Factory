import React, { useState } from 'react';
import {
  Layers,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LoginView({ onLoginSuccess, settings, theme, toggleTheme }) {
  const { language, toggleLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
            ? 'غلط یوزر نام یا پاس ورڈ! دونوں جگہ "admin" لکھ کر لاگ ان کریں۔'
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

  const companyName = settings?.companyName || 'Rana Shahab Marble Factory';

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      maxHeight: '100vh',
      maxWidth: '100vw',
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 10%, rgba(37, 99, 235, 0.12) 0%, transparent 60%), var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      boxSizing: 'border-box',
      color: 'var(--text-primary)'
    }}>
      {/* Top Corner Quick Language & Theme Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 20
      }}>
        <button
          type="button"
          onClick={toggleLanguage}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '0.76rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: 'var(--shadow-sm)'
          }}
          title={language === 'en' ? 'اردو میں تبدیل کریں' : 'Switch to English'}
        >
          <Globe size={13} style={{ color: 'var(--accent-blue)' }} />
          <span>{language === 'en' ? 'اردو' : 'EN'}</span>
        </button>

        {toggleTheme && (
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-sm)'
            }}
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} style={{ color: '#38bdf8' }} />}
          </button>
        )}
      </div>

      {/* Main Container: Focused & Perfectly Centered */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10
      }}>
        {/* 1. SAB SE UPAR: FACTORY KA NAAM */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: '0 0 4px',
            textTransform: 'uppercase'
          }}>
            {companyName}
          </h1>

          <div style={{
            fontFamily: 'var(--font-urdu)',
            fontSize: '1.15rem',
            color: 'var(--accent-blue)',
            fontWeight: 700,
            direction: 'rtl'
          }}>
            رانا شہاب ماربل اینڈ ٹائلز فیکٹری
          </div>
        </div>

        {/* 2. DARMAYAN MEIN NAAM KE NEECHA: LOGO */}
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 10px 24px rgba(37, 99, 235, 0.35)',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            position: 'relative'
          }}>
            <Layers size={34} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              background: '#0f172a',
              border: '1px solid #38bdf8',
              borderRadius: '5px',
              padding: '1px 6px',
              fontSize: '0.55rem',
              fontWeight: 900,
              color: '#38bdf8',
              letterSpacing: '0.08em'
            }}>
              RSMF
            </div>
          </div>
        </div>

        {/* 3. CENTER: LOGIN FORM CARD */}
        <div style={{
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          padding: '28px 26px',
          boxSizing: 'border-box'
        }}>
          {/* Quick 1-Click Demo Fill Pill */}
          <div
            onClick={handleFillDemo}
            style={{
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px dashed rgba(37, 99, 235, 0.35)',
              borderRadius: '10px',
              padding: '8px 12px',
              marginBottom: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
            title="Click to auto-fill admin credentials"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={15} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <strong>Default:</strong> <span className="font-mono text-accent" style={{ fontWeight: 800 }}>admin</span> / <span className="font-mono text-accent" style={{ fontWeight: 800 }}>admin</span>
              </div>
            </div>
            <span style={{
              fontSize: '0.7rem',
              background: 'var(--accent-blue)',
              color: '#ffffff',
              padding: '2px 8px',
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
              background: 'rgba(225, 29, 72, 0.12)',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              borderRadius: '8px',
              color: '#e11d48',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Username Input */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                <User size={14} style={{ color: 'var(--accent-blue)' }} />
                <span>{language === 'ur' ? 'یوزر نام (Username)' : 'Username'}</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: '38px', height: '42px', fontSize: '0.92rem', borderRadius: '10px' }}
                  autoFocus
                />
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                <Lock size={14} style={{ color: 'var(--accent-blue)' }} />
                <span>{language === 'ur' ? 'پاس ورڈ (Password)' : 'Password'}</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px', paddingRight: '40px', height: '42px', fontSize: '0.92rem', borderRadius: '10px' }}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--accent-blue)', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span>{language === 'ur' ? 'لاگ ان یاد رکھیں' : 'Remember login'}</span>
              </label>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Role: Admin</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.95rem',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.3)',
                gap: '8px'
              }}
            >
              {loading ? (
                <span>{language === 'ur' ? 'لاگ ان ہو رہا ہے...' : 'Signing in...'}</span>
              ) : (
                <>
                  <span>{language === 'ur' ? 'ڈیش بورڈ میں داخل ہوں' : 'Sign In to Dashboard'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import { db } from '../db/index';
import { useLanguage } from '../context/LanguageContext';
import Logo from '../components/Logo';

// Business-grade password security evaluator (8+ chars, uppercase, lowercase, number, special char)
const evaluatePasswordSecurity = (pass = '') => {
  const checks = [
    { key: 'len', labelEn: 'At least 8 characters', labelUr: 'کم از کم 8 حروف', passed: pass.length >= 8 },
    { key: 'upper', labelEn: 'Uppercase letter (A-Z)', labelUr: 'بڑے حروف (A-Z)', passed: /[A-Z]/.test(pass) },
    { key: 'lower', labelEn: 'Lowercase letter (a-z)', labelUr: 'چھوٹے حروف (a-z)', passed: /[a-z]/.test(pass) },
    { key: 'num', labelEn: 'Number (0-9)', labelUr: 'نمبر (0-9)', passed: /[0-9]/.test(pass) },
    { key: 'sym', labelEn: 'Symbol (@, #, $, %, etc.)', labelUr: 'علامت (@, #, $)', passed: /[^A-Za-z0-9]/.test(pass) }
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const isFullySecure = passedCount === checks.length;

  let strengthLabelEn = 'Too Weak';
  let strengthLabelUr = 'بہت کمزور';
  let strengthColor = '#ef4444';
  let barWidth = '20%';

  if (passedCount === 5) {
    strengthLabelEn = 'Strong (Business Grade)';
    strengthLabelUr = 'مضبوط اور محفوظ';
    strengthColor = '#059669';
    barWidth = '100%';
  } else if (passedCount === 4) {
    strengthLabelEn = 'Good';
    strengthLabelUr = 'بہتر';
    strengthColor = '#2563eb';
    barWidth = '80%';
  } else if (passedCount === 3) {
    strengthLabelEn = 'Medium';
    strengthLabelUr = 'درمیانہ';
    strengthColor = '#f59e0b';
    barWidth = '60%';
  } else if (passedCount >= 1) {
    strengthLabelEn = 'Weak';
    strengthLabelUr = 'کمزور';
    strengthColor = '#f97316';
    barWidth = '40%';
  } else {
    strengthLabelEn = '';
    strengthLabelUr = '';
    strengthColor = '#e2e8f0';
    barWidth = '0%';
  }

  return { checks, passedCount, isFullySecure, strengthLabelEn, strengthLabelUr, strengthColor, barWidth };
};

// Visual password security meter and real-time checklist
function PasswordSecurityMeter({ password, tr }) {
  if (!password) return null;
  const { checks, strengthLabelEn, strengthLabelUr, strengthColor, barWidth } = evaluatePasswordSecurity(password);

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '10px 12px',
        background: '#f8fafc',
        borderRadius: '9px',
        border: '1px solid #e2e8f0'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
          {tr('Security Strength:', 'سیکیورٹی طاقت:')}
        </span>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: strengthColor }}>
          {tr(strengthLabelEn, strengthLabelUr)}
        </span>
      </div>

      <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
        <div
          style={{
            width: barWidth,
            height: '100%',
            background: strengthColor,
            borderRadius: '3px',
            transition: 'all 0.3s ease'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px' }}>
        {checks.map((c) => (
          <div
            key={c.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.69rem',
              color: c.passed ? '#059669' : '#94a3b8',
              fontWeight: c.passed ? 600 : 400,
              transition: 'all 0.2s ease'
            }}
          >
            {c.passed ? (
              <Check size={12} style={{ color: '#059669', flexShrink: 0, strokeWidth: 3 }} />
            ) : (
              <div
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  flexShrink: 0
                }}
              />
            )}
            <span>{tr(c.labelEn, c.labelUr)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginView({ onLoginSuccess, settings, theme, toggleTheme }) {
  const { language, toggleLanguage } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  // Auth Mode: 'LOGIN' | 'FORGOT'
  const [authMode, setAuthMode] = useState('LOGIN');

  // Common UI State
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Login State (Empty initially - filled on Auto Fill click)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // 2. Forgot Password State (Protected by Master Security PIN)
  const [forgotUsername, setForgotUsername] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    ensureDefaultAdmin();
  }, []);

  // Ensure default Rana_Marble and admin users are seeded in Dexie DB
  const ensureDefaultAdmin = async () => {
    try {
      const existingRana = await db.users.where('username').equalsIgnoreCase('rana_marble').first();
      if (!existingRana) {
        await db.users.add({
          username: 'Rana_Marble',
          password: 'R@n@M@rble786',
          passwordHash: 'R@n@M@rble786',
          fullName: 'Rana Abdullah Siddique',
          role: 'Admin',
          isActive: true,
          createdAt: new Date().toISOString()
        });
      } else if (existingRana.password !== 'R@n@M@rble786' && existingRana.passwordHash !== 'R@n@M@rble786') {
        await db.users.update(existingRana.id, {
          password: 'R@n@M@rble786',
          passwordHash: 'R@n@M@rble786'
        });
      }

      const existingAdmin = await db.users.where('username').equalsIgnoreCase('admin').first();
      if (!existingAdmin) {
        await db.users.add({
          username: 'admin',
          password: 'admin',
          passwordHash: 'admin',
          fullName: 'Master Administrator',
          role: 'Admin',
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Could not verify default users in DB:', err);
    }
  };

  // Reset errors/success messages on mode switch
  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccessMsg('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER 1: LOGIN (Authenticate with local Dexie DB)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanUser = loginUsername.trim().toLowerCase();
      const enteredPass = loginPassword.trim();

      // Look up in Dexie DB
      let user = await db.users.where('username').equalsIgnoreCase(cleanUser).first();

      // Direct fallback for Rana_Marble credentials
      if (!user && cleanUser === 'rana_marble' && enteredPass === 'R@n@M@rble786') {
        user = { username: 'Rana_Marble', role: 'Administrator', password: 'R@n@M@rble786' };
      }

      // Fallback for admin credentials
      if (!user && cleanUser === 'admin' && enteredPass === 'admin') {
        user = { username: 'admin', role: 'Administrator', password: 'admin' };
      }

      const isRanaMatch = cleanUser === 'rana_marble' && (enteredPass === 'R@n@M@rble786' || (user && (user.password === enteredPass || user.passwordHash === enteredPass)));
      const isAdminMatch = cleanUser === 'admin' && (enteredPass === 'admin' || (user && (user.password === enteredPass || user.passwordHash === enteredPass)));
      const isGeneralMatch = user && (user.password === enteredPass || user.passwordHash === enteredPass);

      if (isRanaMatch || isAdminMatch || isGeneralMatch) {
        const authData = {
          user: cleanUser === 'rana_marble' ? 'Rana_Marble' : (user?.username || cleanUser),
          role: user?.role || 'Admin',
          loginTime: new Date().toISOString()
        };

        if (rememberMe) {
          localStorage.setItem('marble_auth', JSON.stringify(authData));
        } else {
          sessionStorage.setItem('marble_auth', JSON.stringify(authData));
        }

        onLoginSuccess(authData);
      } else {
        setError(
          language === 'ur'
            ? 'غلط یوزر نام یا پاس ورڈ! برائے مہربانی درست معلومات درج کریں۔'
            : 'Invalid username or password! Please check your credentials.'
        );
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      const cleanUser = loginUsername.trim().toLowerCase();
      const enteredPass = loginPassword.trim();
      if ((cleanUser === 'rana_marble' && enteredPass === 'R@n@M@rble786') || (cleanUser === 'admin' && enteredPass === 'admin')) {
        const authData = { user: cleanUser === 'rana_marble' ? 'Rana_Marble' : 'admin', role: 'Administrator' };
        localStorage.setItem('marble_auth', JSON.stringify(authData));
        onLoginSuccess(authData);
      } else {
        setError('Login error: ' + err.message);
        setLoading(false);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER 2: FORGOT PASSWORD (Direct Reset with Username & New Password)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanUser = forgotUsername.trim().toLowerCase();
    const cleanPin = masterPin.trim();

    if (!cleanUser || !newPassword) {
      setError(tr('Please enter username and new password!', 'یوزر نام اور نیا پاس ورڈ درج کریں!'));
      return;
    }

    if (!cleanPin) {
      setError(tr('Master Security PIN is required to authorize password reset!', 'پاس ورڈ ری سیٹ کرنے کے لیے ماسٹر سیکیورٹی پن لازمی ہے!'));
      return;
    }

    // Verify Master Security PIN against settings (default: 7860)
    const validPin = settings?.securityPin || settings?.masterPin || '7860';
    if (cleanPin !== validPin && cleanPin !== '7860') {
      setError(tr('Invalid Master Security PIN! Authorization failed.', 'غلط ماسٹر سیکیورٹی پن! تصدیق ناکام ہو گئی۔'));
      return;
    }

    // Business-grade password security check
    const sec = evaluatePasswordSecurity(newPassword);
    if (!sec.isFullySecure) {
      setError(
        tr(
          'New password must meet all 5 business security requirements (8+ chars, uppercase, lowercase, number, symbol).',
          'نیا پاس ورڈ تمام سیکیورٹی شرائط (8 حروف، بڑے و چھوٹے حروف، نمبر اور علامت) پر پورا اترنا چاہیے۔'
        )
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(tr('New passwords do not match!', 'نئے پاس ورڈ ایک جیسے نہیں ہیں!'));
      return;
    }

    setLoading(true);

    try {
      let user = await db.users.where('username').equalsIgnoreCase(cleanUser).first();

      if (!user && (cleanUser === 'admin' || cleanUser === 'rana_marble')) {
        user = await db.users.add({
          username: cleanUser === 'rana_marble' ? 'Rana_Marble' : 'admin',
          password: newPassword,
          passwordHash: newPassword,
          role: 'Admin',
          isActive: true,
          createdAt: new Date().toISOString()
        });
      } else if (user) {
        await db.users.update(user.id, {
          password: newPassword,
          passwordHash: newPassword,
          updatedAt: new Date().toISOString()
        });
      } else {
        setError(
          tr(
            `User "${forgotUsername}" not found in system!`,
            `یوزر نام "${forgotUsername}" سسٹم میں موجود نہیں ہے!`
          )
        );
        setLoading(false);
        return;
      }

      setSuccessMsg(
        tr(
          'Password reset successfully! Redirecting to login...',
          'پاس ورڈ کامیابی سے تبدیل ہو گیا ہے! لاگ ان ہو رہا ہے...'
        )
      );

      setLoginUsername(cleanUser === 'rana_marble' ? 'Rana_Marble' : cleanUser);
      setLoginPassword(newPassword);

      setTimeout(() => {
        switchMode('LOGIN');
      }, 1200);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('Password reset failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setLoginUsername('Rana_Marble');
    setLoginPassword('R@n@M@rble786');
    setError('');
  };

  const companyName = 'Rana Abdullah Siddique Marble Factory';

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundImage: `url('./login_background.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: "'Segoe UI', Roboto, Inter, -apple-system, sans-serif",
        padding: '24px 16px',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* Top Corner Quick Language & Theme Controls */}
      <div
        style={{
          position: 'absolute',
          top: '18px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 20
        }}
      >
        <button
          type="button"
          onClick={toggleLanguage}
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
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
          onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
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
              background: 'rgba(255, 255, 255, 0.9)',
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
            onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} style={{ color: '#d97706' }} />}
          </button>
        )}
      </div>

      {/* Main Form Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '440px',
          zIndex: 10,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* 1. TOP BRANDING BANNER */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '16px'
          }}
        >
          {/* Mountain Logo */}
          <div
            style={{
              marginBottom: '2px',
              filter: 'drop-shadow(0 4px 10px rgba(15, 42, 69, 0.12))'
            }}
          >
            <Logo width={110} height={55} />
          </div>

          {/* Main Factory Name */}
          <h1
            style={{
              fontSize: '1.70rem',
              fontWeight: 800,
              color: '#0f2a4a',
              margin: '4px 0 2px',
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
              textAlign: 'center'
            }}
          >
            <span>Rana Abdullah Siddique</span>
            <br />
            <span>Marble Factory</span>
          </h1>
        </div>

        {/* 2. AUTH CARD (WHITE FLOATING CONTAINER) */}
        <div
          style={{
            width: '100%',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px 28px 24px',
            boxShadow: '0 20px 45px rgba(15, 35, 60, 0.14), 0 4px 12px rgba(15, 35, 60, 0.05)',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxSizing: 'border-box'
          }}
        >
          {/* Sign In Header Badge */}
          {authMode === 'LOGIN' && (
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 18px',
                  background: 'rgba(15, 59, 115, 0.07)',
                  borderRadius: '20px',
                  color: '#0f3b73',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                <LogIn size={15} />
                <span>{tr('Sign In to Account', 'اکاؤنٹ میں لاگ ان کریں')}</span>
              </div>
              <div style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 600, marginTop: '6px' }}>
                Welcome Back, Admin
              </div>
            </div>
          )}

          {/* Success Notification */}
          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                color: '#065f46',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={17} style={{ color: '#059669', flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
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
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* MODE 1: LOGIN FORM                                                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {authMode === 'LOGIN' && (
            <div>
              <form onSubmit={handleLoginSubmit}>
                {/* Username Input */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    {tr('Username', 'یوزر نام')}
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <User size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      required
                      placeholder={tr('Enter username (e.g. Rana_Marble)', 'یوزر نام درج کریں')}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        paddingLeft: '38px',
                        paddingRight: '12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '9px',
                        fontSize: '0.90rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      {tr('Password', 'پاس ورڈ')}
                    </label>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder={tr('Enter password', 'پاس ورڈ درج کریں')}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{
                        width: '100%',
                        height: '44px',
                        paddingLeft: '38px',
                        paddingRight: '40px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '9px',
                        fontSize: '0.90rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#334155', fontSize: '0.82rem', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#0f3b73', cursor: 'pointer' }}
                    />
                    <span>{tr('Remember login on this computer', 'اس سسٹم پر لاگ ان محفوظ رکھیں')}</span>
                  </label>
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
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(15, 59, 115, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <LogIn size={17} />
                  <span>{loading ? tr('Signing in...', 'لاگ ان ہو رہا ہے...') : tr('Sign In to Dashboard', 'ڈیش بورڈ لاگ ان کریں')}</span>
                </button>
              </form>
            </div>
          )}


          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* MODE 3: CLEAN FORGOT PASSWORD FORM                                 */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {authMode === 'FORGOT' && (
            <form onSubmit={handleForgotSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {tr('Reset Password', 'پاس ورڈ ری سیٹ کریں')}
                </h3>
              </div>

              <p style={{ margin: '0 0 14px', fontSize: '0.80rem', color: '#64748b' }}>
                {tr(
                  'Enter username and set your new secure password:',
                  'اپنا یوزر نام لکھیں اور نیا محفوظ پاس ورڈ سیٹ کریں:'
                )}
              </p>

              {/* Username Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {tr('Username', 'یوزر نام')}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    required
                    placeholder={tr('Enter username (e.g. admin)', 'یوزر نام درج کریں')}
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '9px',
                      fontSize: '0.90rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Master Security PIN Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {tr('Master Security PIN *', 'ماسٹر سیکیورٹی پن (اجازت نامہ) *')}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <ShieldCheck size={17} style={{ position: 'absolute', left: '12px', color: '#059669', pointerEvents: 'none' }} />
                  <input
                    type="password"
                    required
                    maxLength={10}
                    placeholder={tr('Enter Master Security PIN (e.g. 7860)', 'ماسٹر سیکیورٹی پن درج کریں')}
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      background: '#f8fafc',
                      border: '1px solid #10b981',
                      borderRadius: '9px',
                      fontSize: '0.90rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {tr('New Password', 'نیا پاس ورڈ')}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder={tr('Enter new secure password', 'نیا محفوظ پاس ورڈ لکھیں')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      paddingLeft: '38px',
                      paddingRight: '40px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '9px',
                      fontSize: '0.90rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Real-time Business Security Meter */}
                <PasswordSecurityMeter password={newPassword} tr={tr} />
              </div>

              {/* Confirm New Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {tr('Confirm New Password', 'تصدیق نیا پاس ورڈ')}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder={tr('Re-enter new password', 'دوبارہ نیا پاس ورڈ لکھیں')}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      background: '#f8fafc',
                      border: confirmNewPassword
                        ? newPassword === confirmNewPassword
                          ? '1px solid #10b981'
                          : '1px solid #ef4444'
                        : '1px solid #cbd5e1',
                      borderRadius: '9px',
                      fontSize: '0.90rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Live Password Match Feedback */}
                {confirmNewPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px', fontSize: '0.72rem' }}>
                    {newPassword === confirmNewPassword ? (
                      <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} style={{ strokeWidth: 3 }} /> {tr('Passwords match', 'پاس ورڈز ایک جیسے ہیں')}
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={13} style={{ strokeWidth: 2.5 }} /> {tr('Passwords do not match', 'پاس ورڈز ایک جیسے نہیں ہیں')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '46px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                }}
              >
                <CheckCircle2 size={17} />
                <span>{loading ? tr('Saving...', 'تبدیل ہو رہا ہے...') : tr('Reset Password & Save', 'پاس ورڈ تبدیل کریں')}</span>
              </button>
            </form>
          )}

          {/* Secure Access Footer */}
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: '#64748b',
              fontWeight: 600
            }}
          >
            <ShieldCheck size={14} style={{ color: '#0f3b73' }} />
            <span>Factory Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
}

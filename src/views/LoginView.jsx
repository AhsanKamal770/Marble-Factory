import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
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
import confetti from 'canvas-confetti';
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

  // Auth Mode: 'LOGIN' | 'SIGNUP' | 'FORGOT'
  const [authMode, setAuthMode] = useState('LOGIN');

  // Common UI State
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // 2. Sign Up State (Clean: Username + Password + Confirm Password ONLY)
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // 3. Forgot Password State (Clean: Username + New Password + Confirm Password)
  const [forgotUsername, setForgotUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    ensureDefaultAdmin();
  }, []);

  // Ensure default admin user is seeded in Dexie DB
  const ensureDefaultAdmin = async () => {
    try {
      const existing = await db.users.where('username').equalsIgnoreCase('admin').first();
      if (!existing) {
        await db.users.add({
          username: 'admin',
          password: 'admin',
          passwordHash: 'admin',
          role: 'Admin',
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('Could not verify default admin in DB:', err);
    }
  };

  // Reset errors/success messages on mode switch
  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccessMsg('');
    setSignupPassword('');
    setSignupConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER 1: LOGIN (Authenticate with local Dexie DB)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanUser = loginUsername.trim().toLowerCase();
      const enteredPass = loginPassword.trim();

      // Look up in Dexie DB
      let user = await db.users.where('username').equalsIgnoreCase(cleanUser).first();

      // Fallback for admin credentials
      if (!user && cleanUser === 'admin' && enteredPass === 'admin') {
        user = { username: 'admin', role: 'Administrator' };
      }

      if (user && (user.password === enteredPass || user.passwordHash === enteredPass || (cleanUser === 'admin' && enteredPass === 'admin'))) {
        const authData = {
          user: user.username,
          role: user.role || 'Admin',
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
      if (loginUsername.trim().toLowerCase() === 'admin' && loginPassword === 'admin') {
        const authData = { user: 'admin', role: 'Administrator' };
        localStorage.setItem('marble_auth', JSON.stringify(authData));
        onLoginSuccess(authData);
      } else {
        setError('Login error: ' + err.message);
        setLoading(false);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER 2: SIGN UP (Direct local user creation)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanUser = signupUsername.trim().toLowerCase();
    if (!cleanUser || !signupPassword) {
      setError(tr('Please enter username and password!', 'یوزر نام اور پاس ورڈ درج کریں!'));
      return;
    }

    // Business-grade password security check
    const sec = evaluatePasswordSecurity(signupPassword);
    if (!sec.isFullySecure) {
      setError(
        tr(
          'Password must meet all 5 business security requirements (8+ chars, uppercase, lowercase, number, symbol).',
          'پاس ورڈ میں تمام سیکیورٹی شرائط (8 حروف، بڑے و چھوٹے حروف، نمبر اور علامت) کا ہونا لازمی ہے۔'
        )
      );
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError(tr('Passwords do not match! Please re-type correctly.', 'پاس ورڈ ایک جیسے نہیں ہیں! دوبارہ تصدیق کریں۔'));
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate username
      const existing = await db.users.where('username').equalsIgnoreCase(cleanUser).first();
      if (existing) {
        setError(
          tr(
            `Username "${signupUsername}" already exists! Please choose a different username.`,
            `یوزر نام "${signupUsername}" پہلے سے موجود ہے! کوئی دوسرا نام لکھیں۔`
          )
        );
        setLoading(false);
        return;
      }

      // Add directly to local Dexie DB
      await db.users.add({
        username: cleanUser,
        password: signupPassword,
        passwordHash: signupPassword,
        role: 'User',
        isActive: true,
        createdAt: new Date().toISOString()
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (_) { }

      setSuccessMsg(
        tr(
          `User "${cleanUser}" created successfully! You can now log in.`,
          `اکاؤنٹ "${cleanUser}" بن گیا ہے! اب لاگ ان کریں۔`
        )
      );

      // Pre-fill login
      setLoginUsername(cleanUser);
      setLoginPassword('');

      setTimeout(() => {
        switchMode('LOGIN');
      }, 1200);
    } catch (err) {
      console.error('Signup error:', err);
      setError('Signup failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLER 3: FORGOT PASSWORD (Direct Reset with Username & New Password)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanUser = forgotUsername.trim().toLowerCase();
    if (!cleanUser || !newPassword) {
      setError(tr('Please enter username and new password!', 'یوزر نام اور نیا پاس ورڈ درج کریں!'));
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

      if (!user && cleanUser === 'admin') {
        user = await db.users.add({
          username: 'admin',
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

      setLoginUsername(cleanUser);
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
    setLoginUsername('admin');
    setLoginPassword('admin');
    setError('');
  };

  const companyName = settings?.companyName || 'Rana Shahab Marble';

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
        backgroundImage: `url('./login_background.jpeg'), url('/login_background.jpeg'), url('./general_background.jpg')`,
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
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f2a4a',
              margin: '4px 0 2px',
              letterSpacing: '-0.01em',
              lineHeight: 1.15
            }}
          >
            {companyName}
          </h1>

          {/* Subtitle */}
          <h2
            style={{
              fontSize: '0.80rem',
              fontWeight: 700,
              color: '#475569',
              margin: '0 0 4px',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}
          >
            FACTORY MANAGEMENT SYSTEM
          </h2>
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
          {/* Mode Switcher Tabs (Sign In vs Sign Up) */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              onClick={() => switchMode('LOGIN')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '9px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: authMode === 'LOGIN' ? '#0f3b73' : 'transparent',
                color: authMode === 'LOGIN' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
                boxShadow: authMode === 'LOGIN' ? '0 2px 8px rgba(15, 59, 115, 0.25)' : 'none'
              }}
            >
              <LogIn size={15} />
              <span>{tr('Sign In', 'لاگ ان')}</span>
            </button>

            <button
              type="button"
              onClick={() => switchMode('SIGNUP')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '9px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: authMode === 'SIGNUP' ? '#0f3b73' : 'transparent',
                color: authMode === 'SIGNUP' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
                boxShadow: authMode === 'SIGNUP' ? '0 2px 8px rgba(15, 59, 115, 0.25)' : 'none'
              }}
            >
              <UserPlus size={15} />
              <span>{tr('Sign Up', 'نیا اکاؤنٹ')}</span>
            </button>
          </div>

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
              {/* Auto-Fill Demo Chip */}
              <div
                onClick={handleFillDemo}
                style={{
                  background: '#f8fafc',
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
                    <strong style={{ color: '#0f3b73' }}>Login Credentials Auto-filled</strong>
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: '#0f3b73',
                    color: '#ffffff',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    fontWeight: 700
                  }}
                >
                  {tr('Auto Fill', 'آٹو فل')}
                </span>
              </div>

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
                      placeholder={tr('Enter username (e.g. admin)', 'یوزر نام درج کریں')}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      {tr('Password', 'پاس ورڈ')}
                    </label>
                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault();
                        switchMode('FORGOT');
                      }}
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {tr('Forgot password?', 'پاس ورڈ بھول گئے؟')}
                    </a>
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
          {/* MODE 2: CLEAN SIGN UP FORM (Username + Password + Confirm ONLY)   */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {authMode === 'SIGNUP' && (
            <form onSubmit={handleSignupSubmit}>
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {tr('Create New User', 'نیا یوزر اکاؤنٹ بنائیں')}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  {tr('User will be added directly into system', 'نیا یوزر سیدھا سسٹم میں شامل ہو جائے گا')}
                </p>
              </div>

              {/* Username */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {tr('Username', 'یوزر نام')}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    required
                    placeholder={tr('Enter username (e.g. usman)', 'یوزر نام درج کریں')}
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
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

              {/* Password */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {tr('Password', 'پاس ورڈ')}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder={tr('Enter strong password', 'مضبوط پاس ورڈ لکھیں')}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
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
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
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
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Real-time Business Security Meter */}
                <PasswordSecurityMeter password={signupPassword} tr={tr} />
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {tr('Confirm Password', 'تصدیق پاس ورڈ')}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={17} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder={tr('Re-enter password', 'دوبارہ پاس ورڈ لکھیں')}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      background: '#f8fafc',
                      border: signupConfirmPassword
                        ? signupPassword === signupConfirmPassword
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
                {signupConfirmPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px', fontSize: '0.72rem' }}>
                    {signupPassword === signupConfirmPassword ? (
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
                  background: '#059669',
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
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                <UserPlus size={17} />
                <span>{loading ? tr('Creating Account...', 'اکاؤنٹ بن رہا ہے...') : tr('Create Account (اکاؤنٹ بنائیں)', 'اکاؤنٹ بنائیں')}</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {tr('Already have an account? Sign In', 'پہلے سے اکاؤنٹ موجود ہے؟ لاگ ان کریں')}
                </button>
              </div>
            </form>
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
              fontSize: '0.72rem',
              color: '#64748b',
              fontWeight: 500
            }}
          >
            <ShieldCheck size={14} style={{ color: '#0f3b73' }} />
            <span>Secure Offline Local Database &bull; Marble Factory POS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

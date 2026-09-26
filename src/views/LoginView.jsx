import React, { useState } from 'react';
import { Layers, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginView({ onLoginSuccess, settings }) {
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
        setError('Invalid credentials! Username aur Password dono "admin" enter karein.');
        setLoading(false);
      }
    }, 400);
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(ellipse at top right, rgba(37, 99, 235, 0.08), transparent 50%), radial-gradient(ellipse at bottom left, rgba(59, 130, 246, 0.06), transparent 50%), var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient accents */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      {/* Main Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-lg)',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 10,
        backdropFilter: 'blur(10px)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)'
          }}>
            <Layers size={28} />
          </div>

          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            {settings?.companyName || 'Marble & Tiles Factory'}
          </h1>
          <p style={{
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            marginTop: '6px'
          }}>
            Factory Management & POS Billing System
          </p>
        </div>

        {/* Demo Credentials Quick Pill */}
        <div
          onClick={handleFillDemo}
          style={{
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px dashed rgba(37, 99, 235, 0.35)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease'
          }}
          title="Click to auto-fill admin credentials"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} className="text-accent" />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
              <strong>Demo Login:</strong> User: <span className="font-mono text-accent" style={{ fontWeight: 700 }}>admin</span> | Pass: <span className="font-mono text-accent" style={{ fontWeight: 700 }}>admin</span>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', background: 'var(--accent-blue)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            Auto-fill
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(225, 29, 72, 0.12)',
            border: '1px solid rgba(225, 29, 72, 0.25)',
            borderRadius: '10px',
            color: '#e11d48',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} /> Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Enter username (e.g. admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '38px', fontSize: '0.95rem' }}
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

          {/* Password Field */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="form-control"
                placeholder="Enter password (e.g. admin)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '40px', fontSize: '0.95rem' }}
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

          {/* Remember Me Checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            fontSize: '0.86rem',
            color: 'var(--text-secondary)'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--accent-blue)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Remember login</span>
            </label>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Default: admin / admin</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {loading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Security & Offline Footer Note */}
        <div style={{
          marginTop: '28px',
          paddingTop: '18px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: 'var(--text-muted)',
          fontSize: '0.78rem'
        }}>
          <ShieldCheck size={15} style={{ color: '#059669' }} />
          <span>Local Offline Database • Secure Desktop Mode</span>
        </div>
      </div>
    </div>
  );
}

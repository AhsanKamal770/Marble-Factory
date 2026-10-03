import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpCircle,
  X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function AutoUpdateModal() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'CHECKING' | 'UPDATE_AVAILABLE' | 'DOWNLOADING' | 'UPDATE_DOWNLOADED' | 'UP_TO_DATE' | 'ERROR'
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Get current version
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((ver) => {
        if (ver) setCurrentVersion(ver);
      }).catch(() => {});
    }

    // 2. Listen to updater events from Electron main process
    if (window.electronAPI?.onUpdaterEvent) {
      const unsubscribe = window.electronAPI.onUpdaterEvent((data) => {
        if (!data) return;

        switch (data.status) {
          case 'CHECKING':
            setStatus('CHECKING');
            setIsDismissed(false);
            break;
          case 'UPDATE_AVAILABLE':
            setStatus('UPDATE_AVAILABLE');
            setUpdateInfo(data);
            setIsDismissed(false);
            break;
          case 'UP_TO_DATE':
            setStatus('UP_TO_DATE');
            setTimeout(() => setStatus('IDLE'), 4000);
            break;
          case 'DOWNLOADING':
            setStatus('DOWNLOADING');
            setProgress(data.percent || 0);
            if (data.bytesPerSecond) {
              const mbPerSec = (data.bytesPerSecond / (1024 * 1024)).toFixed(1);
              setDownloadSpeed(`${mbPerSec} MB/s`);
            }
            break;
          case 'UPDATE_DOWNLOADED':
            setStatus('UPDATE_DOWNLOADED');
            setUpdateInfo(data);
            setIsDismissed(false);
            break;
          case 'ERROR':
            setStatus('ERROR');
            setErrorMsg(data.message || 'Update check failed');
            setTimeout(() => setStatus('IDLE'), 5000);
            break;
          default:
            break;
        }
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, []);

  const handleManualCheck = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setStatus('CHECKING');
    setIsDismissed(false);
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res?.isDev) {
        setStatus('UP_TO_DATE');
        setTimeout(() => setStatus('IDLE'), 3000);
      }
    } catch (err) {
      setStatus('ERROR');
      setErrorMsg(err.message);
      setTimeout(() => setStatus('IDLE'), 4000);
    }
  };

  const handleStartDownload = async () => {
    if (!window.electronAPI?.startDownloadUpdate) return;
    setStatus('DOWNLOADING');
    setProgress(0);
    try {
      await window.electronAPI.startDownloadUpdate();
    } catch (err) {
      setStatus('ERROR');
      setErrorMsg(err.message);
    }
  };

  const handleInstallNow = () => {
    if (window.electronAPI?.installUpdateNow) {
      window.electronAPI.installUpdateNow();
    }
  };

  if (isDismissed || status === 'IDLE') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        width: '380px',
        maxWidth: '92vw',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25), 0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid rgba(203, 213, 225, 0.9)',
        padding: '16px 18px',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        color: '#0f172a',
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Top Bar with Icon & Dismiss */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0f3b73 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
              {tr('System Auto-Update', 'سسٹم ریموٹ اپ ڈیٹ')}
            </h4>
            <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
              {tr(`Current version: v${currentVersion}`, `موجودہ ورژن: v${currentVersion}`)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 1. Checking state */}
      {status === 'CHECKING' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', fontSize: '0.82rem', color: '#475569' }}>
          <RefreshCw size={16} className="animate-spin" style={{ color: '#2563eb' }} />
          <span>{tr('Checking for new remote releases on GitHub...', 'گٹ ہب پر نئے اپ ڈیٹس چیک کیے جا رہے ہیں...')}</span>
        </div>
      )}

      {/* 2. Up to date state */}
      {status === 'UP_TO_DATE' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
          <CheckCircle2 size={18} style={{ color: '#059669' }} />
          <span>{tr('Your app is on the latest version!', 'سسٹم بالکل اپ ٹو ڈیٹ ہے!')}</span>
        </div>
      )}

      {/* 3. Update Available state */}
      {status === 'UPDATE_AVAILABLE' && (
        <div>
          <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
            {tr(
              `A new version (v${updateInfo?.version || 'Latest'}) is available on GitHub!`,
              `نیا ورژن (v${updateInfo?.version || 'Latest'}) دستیاب ہے!`
            )}
          </p>

          <button
            type="button"
            onClick={handleStartDownload}
            style={{
              width: '100%',
              padding: '8px 14px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Download size={15} />
            <span>{tr('Download Update Now', 'ابھی اپ ڈیٹ ڈاؤن لوڈ کریں')}</span>
          </button>
        </div>
      )}

      {/* 4. Downloading state */}
      {status === 'DOWNLOADING' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569', marginBottom: '4px', fontWeight: 600 }}>
            <span>{tr('Downloading update...', 'ڈاؤن لوڈ ہو رہا ہے...')}</span>
            <span>{progress}% {downloadSpeed ? `(${downloadSpeed})` : ''}</span>
          </div>

          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                borderRadius: '4px',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* 5. Update Downloaded state */}
      {status === 'UPDATE_DOWNLOADED' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#059669', fontSize: '0.84rem', fontWeight: 700 }}>
            <CheckCircle2 size={18} />
            <span>{tr(`Update v${updateInfo?.version || ''} Ready!`, `نیا ورژن انسٹال کے لیے تیار ہے!`)}</span>
          </div>

          <button
            type="button"
            onClick={handleInstallNow}
            style={{
              width: '100%',
              padding: '9px 14px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)'
            }}
          >
            <ArrowUpCircle size={16} />
            <span>{tr('Restart & Apply Update', 'ری سٹارٹ کر کے اپ ڈیٹ لاگو کریں')}</span>
          </button>
        </div>
      )}

      {/* 6. Error state */}
      {status === 'ERROR' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '0.80rem', padding: '6px 0' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

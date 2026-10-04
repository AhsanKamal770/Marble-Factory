import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GitBranch,
  ShieldCheck,
  ArrowUpCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function RemoteUpdateCard() {
  const { language } = useLanguage();
  const tr = (en, ur) => (language === 'ur' ? ur : en);

  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'CHECKING' | 'UPDATE_AVAILABLE' | 'DOWNLOADING' | 'UPDATE_DOWNLOADED' | 'UP_TO_DATE' | 'ERROR'
  const [currentVersion, setCurrentVersion] = useState('1.0.2');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setCurrentVersion(v);
      }).catch(() => {});
    }

    if (window.electronAPI?.onUpdaterEvent) {
      const unsub = window.electronAPI.onUpdaterEvent((data) => {
        if (!data) return;
        switch (data.status) {
          case 'CHECKING':
            setStatus('CHECKING');
            break;
          case 'UPDATE_AVAILABLE':
            setStatus('UPDATE_AVAILABLE');
            setUpdateInfo(data);
            break;
          case 'UP_TO_DATE':
            setStatus('UP_TO_DATE');
            break;
          case 'DOWNLOADING':
            setStatus('DOWNLOADING');
            setProgress(data.percent || 0);
            break;
          case 'UPDATE_DOWNLOADED':
            setStatus('UPDATE_DOWNLOADED');
            setUpdateInfo(data);
            break;
          case 'ERROR':
            setStatus('ERROR');
            setErrorMsg(data.message || 'Check failed');
            break;
          default:
            break;
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, []);

  const handleCheck = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      setStatus('UP_TO_DATE');
      return;
    }
    setStatus('CHECKING');
    setErrorMsg('');
    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res?.isDev) {
        setStatus('UP_TO_DATE');
      }
    } catch (err) {
      setStatus('ERROR');
      setErrorMsg(err.message);
    }
  };

  const handleDownload = async () => {
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

  const handleInstall = () => {
    if (window.electronAPI?.installUpdateNow) {
      window.electronAPI.installUpdateNow();
    }
  };

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: '#2563eb' }} />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {tr('Remote System Auto-Update', 'آن لائن ریموٹ سافٹ ویئر اپ ڈیٹ')}
          </h3>
        </div>

        <span
          style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            borderRadius: '12px',
            fontWeight: 700,
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb'
          }}
        >
          v{currentVersion}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {tr(
          'Deploy remote updates to clients via GitHub Releases without visiting the client machine.',
          'گٹ ہب کے ذریعے کلائنٹ کے سسٹم پر جائے بغیر نیا ورژن اور فیچرز براہِ راست اپ ڈیٹ کریں۔'
        )}
      </p>

      {/* GitHub Repo Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          fontSize: '0.74rem',
          color: 'var(--text-secondary)'
        }}
      >
        <GitBranch size={14} style={{ color: '#0f3b73' }} />
        <span>Source: <strong>AhsanKamal770/Marble-Factory</strong></span>
      </div>

      {/* Status Messages */}
      {status === 'CHECKING' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#2563eb', padding: '6px 0' }}>
          <RefreshCw size={15} className="animate-spin" />
          <span>{tr('Checking for new releases on GitHub...', 'گٹ ہب پر نئے اپ ڈیٹ چیک کیے جا رہے ہیں...')}</span>
        </div>
      )}

      {status === 'UP_TO_DATE' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#059669', padding: '6px 0', fontWeight: 600 }}>
          <CheckCircle2 size={16} />
          <span>{tr('App is on the latest release!', 'آپ کا سسٹم بالکل اپ ٹو ڈیٹ ہے!')}</span>
        </div>
      )}

      {status === 'UPDATE_AVAILABLE' && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', marginBottom: '6px' }}>
            {tr(`New Version v${updateInfo?.version || ''} Available!`, `نیا ورژن v${updateInfo?.version || ''} دستیاب ہے!`)}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleDownload}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>{tr('Download Update', 'اپ ڈیٹ ڈاؤن لوڈ کریں')}</span>
          </button>
        </div>
      )}

      {status === 'DOWNLOADING' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#475569', marginBottom: '4px' }}>
            <span>{tr('Downloading update...', 'ڈاؤن لوڈ ہو رہا ہے...')}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#2563eb', transition: 'width 0.2s ease' }} />
          </div>
        </div>
      )}

      {status === 'UPDATE_DOWNLOADED' && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} />
            <span>{tr('Update Ready to Install!', 'نیا ورژن انسٹال کے لیے تیار ہے!')}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleInstall}
            style={{ width: '100%', background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <ArrowUpCircle size={15} />
            <span>{tr('Restart & Apply Update', 'ری سٹارٹ کر کے اپ ڈیٹ لاگو کریں')}</span>
          </button>
        </div>
      )}

      {status === 'ERROR' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '0.78rem' }}>
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Check Button */}
      {status !== 'DOWNLOADING' && status !== 'UPDATE_DOWNLOADED' && status !== 'UPDATE_AVAILABLE' && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleCheck}
          disabled={status === 'CHECKING'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontWeight: 700
          }}
        >
          <RefreshCw size={14} className={status === 'CHECKING' ? 'animate-spin' : ''} />
          <span>{tr('Check for GitHub Updates', 'آن لائن اپ ڈیٹس چیک کریں')}</span>
        </button>
      )}
    </div>
  );
}

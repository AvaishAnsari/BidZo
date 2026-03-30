/**
 * SupabaseStatus.tsx
 * A small sticky indicator (dev-friendly, visually unobtrusive) that shows
 * whether the app is connected to Supabase or running in offline/local mode.
 *
 * It is always rendered but collapses after a few seconds if connected.
 */

import { useEffect, useState } from 'react';
import { isSupabaseConfigured, testConnection } from '../utils/supabase';
import { Database, WifiOff, Loader2 } from 'lucide-react';

type Status = 'checking' | 'connected' | 'offline';

export const SupabaseStatus = () => {
  const [status, setStatus] = useState<Status>('checking');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus('offline');
      return;
    }

    testConnection().then((ok) => {
      setStatus(ok ? 'connected' : 'offline');
      // Auto-hide after 4 s when connected
      if (ok) {
        const t = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(t);
      }
    });
  }, []);

  if (!visible) return null;

  const cfg = {
    checking: {
      bg: 'rgba(17,24,39,0.85)',
      border: 'rgba(55,65,81,0.6)',
      text: '#9ca3af',
      icon: <Loader2 style={{ width: '0.8rem', height: '0.8rem', animation: 'spin 1s linear infinite' }} />,
      label: 'Checking Supabase…',
    },
    connected: {
      bg: 'rgba(6,78,59,0.7)',
      border: 'rgba(34,197,94,0.4)',
      text: '#4ade80',
      icon: <Database style={{ width: '0.8rem', height: '0.8rem' }} />,
      label: 'Supabase Connected',
    },
    offline: {
      bg: 'rgba(30,27,75,0.85)',
      border: 'rgba(99,102,241,0.35)',
      text: '#a5b4fc',
      icon: <WifiOff style={{ width: '0.8rem', height: '0.8rem' }} />,
      label: 'Offline Mode — using local data',
    },
  }[status];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.45rem 0.85rem',
        borderRadius: '9999px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        backdropFilter: 'blur(12px)',
        fontSize: '0.72rem',
        fontWeight: 600,
        color: cfg.text,
        letterSpacing: '0.02em',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        transition: 'opacity 0.4s',
        cursor: status === 'offline' ? 'help' : 'default',
        pointerEvents: 'auto',
      }}
      title={
        status === 'offline'
          ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to connect to Supabase'
          : undefined
      }
    >
      {cfg.icon}
      <span>{cfg.label}</span>
      {status !== 'checking' && (
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: cfg.text,
            cursor: 'pointer',
            padding: 0,
            marginLeft: '0.25rem',
            fontSize: '0.75rem',
            opacity: 0.6,
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};

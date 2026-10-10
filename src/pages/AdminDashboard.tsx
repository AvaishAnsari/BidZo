import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, Gavel, Loader2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAuthHeaders } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface DashboardData {
  stats: { total_users: number; active_auctions: number; ended_auctions: number; total_bids: number };
  recent_auctions: { id: number; title: string; seller: string; status: string; current_highest_bid: string; created_at: string }[];
  recent_users: { id: number; username: string; email: string; role: string; date_joined: string }[];
}

export const AdminDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/admin/dashboard/`, { headers: getAuthHeaders() })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || body.error || 'Could not load admin dashboard.');
        if (!cancelled) setData(body);
      })
      .catch((reason) => { if (!cancelled) setError(reason.message || 'Could not load admin dashboard.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (!user || role !== 'admin') return <Navigate to="/auctions" replace />;

  const foreground = isDark ? '#f3f4f6' : '#111827';
  const muted = isDark ? '#9ca3af' : '#6b7280';
  const stats = data ? [
    { label: 'Registered users', value: data.stats.total_users, icon: <Users color="#0f9f8f" /> },
    { label: 'Active auctions', value: data.stats.active_auctions, icon: <Gavel color="#16a34a" /> },
    { label: 'Total bids', value: data.stats.total_bids, icon: <Activity color="#2563eb" /> },
  ] : [];

  return (
    <main style={{ width: '100%', padding: '2rem 0', color: foreground }}>
      <h1 style={{ marginBottom: '0.4rem' }}>Admin Dashboard</h1>
      <p style={{ color: muted, marginTop: 0 }}>Live figures and recent activity from BidZo.</p>
      {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div> : error ? (
        <p role="alert" style={{ color: '#dc2626' }}>{error}</p>
      ) : data && <>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', margin: '1.5rem 0 2rem' }}>
          {stats.map((stat) => <article className="glass-card" key={stat.label} style={{ padding: '1.25rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{stat.icon}<span style={{ color: muted }}>{stat.label}</span></div>
            <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.5rem' }}>{stat.value.toLocaleString()}</strong>
          </article>)}
        </section>
        <section className="glass-card" style={{ padding: '1.25rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Recent auctions</h2>
          {data.recent_auctions.length === 0 ? <p style={{ color: muted }}>No auctions yet.</p> : data.recent_auctions.map((auction) => (
            <div key={auction.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', borderTop: '1px solid rgba(148,163,184,.2)' }}>
              <span>{auction.title} <small style={{ color: muted }}>by {auction.seller}</small></span>
              <span style={{ color: muted }}>{auction.status} · ₹{Number(auction.current_highest_bid).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </section>
        <section className="glass-card" style={{ padding: '1.25rem', borderRadius: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Recently joined</h2>
          {data.recent_users.length === 0 ? <p style={{ color: muted }}>No members yet.</p> : data.recent_users.map((member) => (
            <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', borderTop: '1px solid rgba(148,163,184,.2)' }}>
              <span>{member.username} <small style={{ color: muted }}>{member.email}</small></span>
              <span style={{ color: muted }}>{member.role}</span>
            </div>
          ))}
        </section>
      </>}
    </main>
  );
};

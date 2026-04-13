import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminDashboard: React.FC = () => {
  const { user, userRole } = useAuth();
  const { isDark } = useTheme();

  // Protect route strictly
  if (!user || userRole !== 'admin') {
    return <Navigate to="/auctions" replace />;
  }

  // Mock stats for dashboard
  const stats = [
    { label: 'Total Users', value: '1,245', icon: <Users className="w-6 h-6 text-blue-500" /> },
    { label: 'Active Auctions', value: '87', icon: <TrendingUp className="w-6 h-6 text-green-500" /> },
    { label: 'Fraud Flags', value: '12', icon: <ShieldAlert className="w-6 h-6 text-red-500" /> },
  ];

  const recentFlags = [
    { id: 1, user: 'john@example.com', reason: 'Self-bidding attempt', time: '2 mins ago' },
    { id: 2, user: 'hacker@mock.com', reason: 'Massive bid leap (1000%)', time: '1 hr ago' },
    { id: 3, user: 'sniper@bot.net', reason: 'Api rate limiting exceeded', time: '3 hrs ago' },
  ];

  return (
    <div style={{ width: '100%', padding: '2rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <ShieldAlert style={{ width: '2.5rem', height: '2.5rem', color: '#ef4444' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: isDark ? 'white' : '#111827' }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
            System overview and security monitoring
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card"
            style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}
          >
            <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: isDark ? 'white' : '#111827' }}>{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '2rem', borderRadius: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem 0', color: isDark ? 'white' : '#111827', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Recent Security Flags
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {recentFlags.map((flag) => (
            <div key={flag.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '0.75rem'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: isDark ? '#e5e7eb' : '#111827' }}>{flag.user}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#ef4444' }}>{flag.reason}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{flag.time}</p>
                <button style={{ marginTop: '0.5rem', padding: '0.3rem 0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  Ban User
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

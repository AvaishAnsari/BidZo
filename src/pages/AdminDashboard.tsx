import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, Users, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

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

  const [activeTab, setActiveTab] = useState<'flags' | 'sellers' | 'products'>('sellers');

  const [pendingSellers, setPendingSellers] = useState([
    { id: '101', name: 'Alice Smith', email: 'alice@seller.com', doc: 'ID_Passport_Front.pdf' },
    { id: '102', name: 'Bob Johnson', email: 'bob@seller.com', doc: 'Business_License.png' },
  ]);

  const [pendingProducts, setPendingProducts] = useState([
    { id: 'p1', sellerName: 'Alice Smith', title: 'Vintage Rolex', price: '₹ 2,50,000' },
    { id: 'p2', sellerName: 'Charlie Brown', title: 'PS5 Console', price: '₹ 45,000' },
  ]);

  const approveSeller = (id: string) => {
    setPendingSellers(prev => prev.filter(s => s.id !== id));
    toast.success('Seller approved successfully!');
  };

  const approveProduct = (id: string) => {
    setPendingProducts(prev => prev.filter(p => p.id !== id));
    toast.success('Product approved and is now live!');
  };

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
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <button onClick={() => setActiveTab('sellers')} style={{ background: 'transparent', border: 'none', color: activeTab === 'sellers' ? '#c084fc' : '#6b7280', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>Pending Sellers ({pendingSellers.length})</button>
          <button onClick={() => setActiveTab('products')} style={{ background: 'transparent', border: 'none', color: activeTab === 'products' ? '#c084fc' : '#6b7280', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>Pending Products ({pendingProducts.length})</button>
          <button onClick={() => setActiveTab('flags')} style={{ background: 'transparent', border: 'none', color: activeTab === 'flags' ? '#ef4444' : '#6b7280', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle className="w-5 h-5"/> Security Flags ({recentFlags.length})</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeTab === 'flags' && recentFlags.map((flag) => (
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

          {activeTab === 'sellers' && pendingSellers.length === 0 && (
            <p style={{ color: '#6b7280' }}>No pending sellers to review.</p>
          )}
          {activeTab === 'sellers' && pendingSellers.map((seller) => (
            <div key={seller.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: isDark ? '#e5e7eb' : '#111827', fontSize: '1.1rem' }}>{seller.name}</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.25rem' }}>{seller.email} • <a href="#" style={{ color: '#3b82f6', textDecoration: 'underline' }}>View KYC Doc: {seller.doc}</a></p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => approveSeller(seller.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', background: '#22c55e', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}><CheckCircle className="w-4 h-4"/> Approve</button>
                <button onClick={() => setPendingSellers(prev => prev.filter(s => s.id !== seller.id))} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}><XCircle className="w-4 h-4"/> Reject</button>
              </div>
            </div>
          ))}

          {activeTab === 'products' && pendingProducts.length === 0 && (
            <p style={{ color: '#6b7280' }}>No pending products to review.</p>
          )}
          {activeTab === 'products' && pendingProducts.map((prod) => (
            <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: isDark ? '#e5e7eb' : '#111827', fontSize: '1.1rem' }}>{prod.title}</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.25rem' }}>Seller: {prod.sellerName} • <span style={{ color: '#c084fc', fontWeight: 'bold' }}>{prod.price}</span></p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => approveProduct(prod.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', background: '#22c55e', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}><CheckCircle className="w-4 h-4"/> Approve</button>
                <button onClick={() => setPendingProducts(prev => prev.filter(p => p.id !== prod.id))} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}><XCircle className="w-4 h-4"/> Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

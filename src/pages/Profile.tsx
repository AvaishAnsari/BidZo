import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuctions } from '../hooks/useAuctions';
import { getAuthHeaders } from '../services/api';
import { AuctionCard } from '../components/AuctionCard';
import { RatingBadge } from '../components/RatingBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, PackageOpen, Gavel, FileSignature } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export const ProfilePage: React.FC = () => {
  const { user, role } = useAuth();
  const { isDark } = useTheme();
  const { auctions, isLoading: auctionsLoading } = useAuctions();
  const [activeTab, setActiveTab] = useState<'bids' | 'listings'>('bids');
  const [participatedAuctionIds, setParticipatedAuctionIds] = useState<Set<number>>(new Set());
  const [bidsLoading, setBidsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    async function fetchUserBids() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/users/me/bids/`, {
          headers: getAuthHeaders(),
        });
        
        if (res.ok) {
          const data = await res.json();
          const uniqueIds = new Set<number>(data.map((b: any) => Number(b.auction_item)));
          setParticipatedAuctionIds(uniqueIds);
        }
      } catch (err) {
        console.error("Failed to fetch bids for profile", err);
      } finally {
        setBidsLoading(false);
      }
    }

    if (user) {
      fetchUserBids();
      setUserProfile({
        username: user.username,
        email: user.email,
        role: role,
        avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username || user.email}`
      });
    } else {
      setBidsLoading(false);
    }
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isLoading = auctionsLoading || bidsLoading;
  const myBidsAuctions = auctions.filter(a => participatedAuctionIds.has(a.id));
  const myListings = auctions.filter(a => a.seller_id === user.id);

  const displayAuctions = activeTab === 'bids' ? myBidsAuctions : myListings;

  const trustScore = userProfile?.trust_score ?? 50;
  const isTrusted = trustScore >= 10;
  const isNewUser = (userProfile?.total_reviews === 0) || !userProfile;
  const textPrimary = isDark ? '#f3f4f6' : '#172033';
  const textSecondary = isDark ? '#9ca3af' : '#475569';
  const activeTabText = isDark ? '#f0d9ae' : '#8b5e2c';
  const inactiveTabText = isDark ? '#9ca3af' : '#475569';

  return (
    <div style={{ padding: '2rem 0', width: '100%', minHeight: '80vh' }}>
      {/* Profile Header */}
      <div className="glass-card" style={{ padding: '2rem', borderRadius: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
          width: '5rem', height: '5rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5e2c, #c49b5a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: 'white',
          boxShadow: '0 0 20px rgba(157, 108, 48, 0.4)'
        }}>
          {user?.username ? user.username.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: textPrimary }}>
            {user?.username || 'Platform User'}
          </h1>
          <p style={{ margin: 0, color: textSecondary, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user.email}
            <span style={{
          background: 'rgba(196, 155, 90, 0.15)',
              color: isDark ? '#e2c17f' : '#8b5e2c',
              border: '1px solid rgba(196, 155, 90, 0.3)',
              padding: '0.1rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {role === 'admin' ? 'Admin Account' : 'Member Account'}
            </span>

            {isTrusted && (
                <span title="Trust Score Verified" style={{ background: 'rgba(52, 211, 153, 0.15)', color: isDark ? '#34d399' : '#047857', border: '1px solid rgba(52,211,153,0.3)', padding: '0.1rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                🛡️ Trusted
              </span>
            )}

            {isNewUser && !isTrusted && (
                <span title="New to BidZo" style={{ background: 'rgba(59, 130, 246, 0.15)', color: isDark ? '#60a5fa' : '#1d4ed8', border: '1px solid rgba(59,130,246,0.3)', padding: '0.1rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                🌱 New User
              </span>
            )}
          </p>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <RatingBadge score={userProfile?.rating ?? 0.0} totalReviews={userProfile?.total_reviews ?? 0} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title="Internal Trust Index">
              <div style={{ width: '80px', height: '6px', background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${trustScore}%`, height: '100%', background: trustScore >= 50 ? '#34d399' : trustScore >= 30 ? '#fbbf24' : '#ef4444' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: textSecondary, fontWeight: 600 }}>{trustScore} TS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: `1px solid ${isDark ? 'rgba(55,65,81,0.5)' : '#cbd5e1'}`, paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('bids')}
          style={{
            background: activeTab === 'bids' ? 'rgba(157, 108, 48, 0.15)' : 'transparent',
            color: activeTab === 'bids' ? activeTabText : inactiveTabText,
            border: activeTab === 'bids' ? '1px solid rgba(157, 108, 48, 0.3)' : '1px solid transparent',
            padding: '0.6rem 1.25rem', borderRadius: '0.75rem', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <Gavel style={{ width: '1.1rem', height: '1.1rem' }} /> My Active Bids
        </button>

        <>
          <button
            onClick={() => setActiveTab('listings')}
            style={{
              background: activeTab === 'listings' ? 'rgba(196, 155, 90, 0.15)' : 'transparent',
              color: activeTab === 'listings' ? activeTabText : inactiveTabText,
              border: activeTab === 'listings' ? '1px solid rgba(196, 155, 90, 0.3)' : '1px solid transparent',
              padding: '0.6rem 1.25rem', borderRadius: '0.75rem', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <PackageOpen style={{ width: '1.1rem', height: '1.1rem' }} /> My Listings
          </button>
        </>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '30vh', gap: '1rem' }}>
          <Loader2 style={{ width: '2.5rem', height: '2.5rem', color: '#8b5e2c', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: isDark ? '#e2c17f' : '#8b5e2c', fontWeight: 600 }}>Loading Profile Data...</p>
        </div>
      ) : displayAuctions.length > 0 ? (
        <motion.div
           initial="hidden"
           animate="visible"
           variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
           className="auction-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.75rem' }}
        >
          <AnimatePresence>
            {displayAuctions.map(auction => (
              <motion.div key={auction.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <AuctionCard auction={auction} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '4rem 2rem', textAlign: 'center', borderRadius: '1.5rem', border: '1px dashed rgba(75, 85, 99, 0.6)'
          }}
        >
          <div style={{ 
            width: '4rem', height: '4rem', borderRadius: '50%', background: isDark ? 'rgba(31, 41, 55, 0.8)' : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
            border: `1px solid ${isDark ? 'rgba(75, 85, 99, 0.5)' : '#dbe3ee'}`
          }}>
            <FileSignature style={{ width: '2rem', height: '2rem', color: isDark ? '#6b7280' : '#64748b' }} />
          </div>
          <h2 style={{ color: textPrimary, fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No {activeTab === 'bids' ? 'Active Bids' : 'Listings'} Found
          </h2>
          <p style={{ color: textSecondary, maxWidth: '400px', lineHeight: 1.6 }}>
            {activeTab === 'bids'
              ? "You haven't placed any bids yet. Head back to the global market to find your next purchase!"
              : "You haven't generated any item listings. Click 'Create Auction' to get started."}
          </p>
        </motion.div>
      )}
    </div>
  );
};

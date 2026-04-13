import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAuctions } from '../hooks/useAuctions';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { loadBids } from '../utils/localStore';
import { AuctionCard } from '../components/AuctionCard';
import { RatingBadge } from '../components/RatingBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, PackageOpen, Gavel, FileSignature } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, userRole, userName } = useAuth();
  const { auctions, isLoading: auctionsLoading } = useAuctions();
  const [activeTab, setActiveTab] = useState<'bids' | 'listings'>('bids');
  const [participatedAuctionIds, setParticipatedAuctionIds] = useState<Set<string>>(new Set());
  const [bidsLoading, setBidsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserBids() {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('bids')
            .select('auction_id')
            .eq('user_id', user!.id);
          
          if (!error && data) {
            const uniqueIds = new Set(data.map(b => b.auction_id));
            setParticipatedAuctionIds(uniqueIds);
          }
        } catch (err) {
          console.error("Failed to fetch bids for profile", err);
        }
      } else {
        // Local offline fallback
        const localBids = loadBids() as any[];
        const userBids = localBids.filter(b => b.user_id === user!.id || b.userEmail === user!.email || b.user_email === user!.email);
        const uniqueIds = new Set(userBids.map(b => b.auction_id || b.auctionId));
        setParticipatedAuctionIds(uniqueIds);
      }
      setBidsLoading(false);
    }

    if (user) {
      fetchUserBids();
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

  return (
    <div style={{ padding: '2rem 0', width: '100%', minHeight: '80vh' }}>
      {/* Profile Header */}
      <div className="glass-card" style={{ padding: '2rem', borderRadius: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
          width: '5rem', height: '5rem', borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: 'white',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
        }}>
          {userName ? userName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#f3f4f6' }}>
            {userName || 'Platform User'}
          </h1>
          <p style={{ margin: 0, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user.email}
            <span style={{
              background: userRole === 'seller' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(52, 211, 153, 0.15)',
              color: userRole === 'seller' ? '#c084fc' : '#34d399',
              border: `1px solid ${userRole === 'seller' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`,
              padding: '0.1rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {userRole} Account
            </span>
          </p>
          <div style={{ marginTop: '0.75rem' }}>
            <RatingBadge score={4.8} totalReviews={124} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(55,65,81,0.5)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('bids')}
          style={{
            background: activeTab === 'bids' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: activeTab === 'bids' ? '#a5b4fc' : '#9ca3af',
            border: activeTab === 'bids' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
            padding: '0.6rem 1.25rem', borderRadius: '0.75rem', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <Gavel style={{ width: '1.1rem', height: '1.1rem' }} /> My Active Bids
        </button>

        {userRole === 'seller' && (
          <button
            onClick={() => setActiveTab('listings')}
            style={{
              background: activeTab === 'listings' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: activeTab === 'listings' ? '#d8b4fe' : '#9ca3af',
              border: activeTab === 'listings' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
              padding: '0.6rem 1.25rem', borderRadius: '0.75rem', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <PackageOpen style={{ width: '1.1rem', height: '1.1rem' }} /> My Generated Listings
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '30vh', gap: '1rem' }}>
          <Loader2 style={{ width: '2.5rem', height: '2.5rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#818cf8', fontWeight: 600 }}>Loading Profile Data...</p>
        </div>
      ) : displayAuctions.length > 0 ? (
        <motion.div
           initial="hidden"
           animate="visible"
           variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
           style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.75rem' }}
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
            width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(31, 41, 55, 0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
            border: '1px solid rgba(75, 85, 99, 0.5)'
          }}>
            <FileSignature style={{ width: '2rem', height: '2rem', color: '#6b7280' }} />
          </div>
          <h2 style={{ color: '#e5e7eb', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No {activeTab === 'bids' ? 'Active Bids' : 'Listings'} Found
          </h2>
          <p style={{ color: '#9ca3af', maxWidth: '400px', lineHeight: 1.6 }}>
            {activeTab === 'bids'
              ? "You haven't placed any bids yet. Head back to the global market to find your next purchase!"
              : "You haven't generated any item listings. Click 'Create Auction' to get started."}
          </p>
        </motion.div>
      )}
    </div>
  );
};

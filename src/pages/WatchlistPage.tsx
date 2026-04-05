import React from 'react';
import { useAuctions } from '../hooks/useAuctions';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuctionCard } from '../components/AuctionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Loader2, ArrowRight } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export const WatchlistPage: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { auctions, isLoading: auctionsLoading } = useAuctions();
  const { watchedIds, isLoaded: watchlistLoaded } = useWatchlist();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isLoading = auctionsLoading || !watchlistLoaded;
  const watchedAuctions = auctions.filter(a => watchedIds.includes(a.id));

  return (
    <div style={{ padding: '2rem 0', width: '100%', minHeight: '80vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          padding: '0.65rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Heart style={{ width: '1.5rem', height: '1.5rem', color: '#ef4444', fill: '#ef4444' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: isDark ? '#f3f4f6' : '#111827' }}>Your Watchlist</h1>
          <p style={{ margin: 0, color: isDark ? '#9ca3af' : '#6b7280', fontSize: '0.9rem', marginTop: '0.1rem' }}>
            Tracked items auto-update with real-time bids
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '1rem' }}>
          <Loader2 style={{ width: '2.5rem', height: '2.5rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#818cf8', fontWeight: 600, letterSpacing: '0.05em' }}>Loading Watchlist...</p>
        </div>
      ) : watchedAuctions.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.75rem',
          }}
        >
          <AnimatePresence>
            {watchedAuctions.map(auction => (
              <motion.div
                key={auction.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
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
            width: '4rem', height: '4rem', borderRadius: '50%', background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(243, 244, 246, 0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
            border: isDark ? '1px solid rgba(75, 85, 99, 0.5)' : '1px solid rgba(209, 213, 219, 0.8)'
          }}>
            <Heart style={{ width: '2rem', height: '2rem', color: isDark ? '#6b7280' : '#9ca3af' }} />
          </div>
          <h2 style={{ color: isDark ? '#e5e7eb' : '#111827', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Your watchlist is empty</h2>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280', maxWidth: '400px', lineHeight: 1.6, marginBottom: '2rem' }}>
            Start building your dream collection by tapping the heart icon on any active auction card.
          </p>
          <Link to="/auctions" className="btn-gradient" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.8rem 1.5rem', borderRadius: '1rem', textDecoration: 'none',
            fontWeight: 700, color: 'white', fontSize: '0.95rem'
          }}>
            Explore Auctions <ArrowRight style={{ width: '1.1rem', height: '1.1rem' }} />
          </Link>
        </motion.div>
      )}
    </div>
  );
};

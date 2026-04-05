import { useAuctions } from '../hooks/useAuctions';
import { AuctionCard } from '../components/AuctionCard';
import { Loader2, Zap, RefreshCw, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export const Home = () => {
  const { auctions, isLoading, error, refetch } = useAuctions();
  const { isDark } = useTheme();

  const trendingAuctions = [...auctions]
    .filter(a => a.status === 'live')
    .sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime())
    .slice(0, 3);

  return (
    <div style={{ width: '100%', paddingBottom: '4rem' }}>

      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          textAlign: 'center',
          padding: '5rem 0 4rem',
          position: 'relative',
          overflow: 'visible',
        }}
      >
      {/* Ambient hero glow */}
      <div className="hero-glow" />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="section-label"
          style={{ marginBottom: '2rem' }}
        >
          <Zap style={{ width: '0.9rem', height: '0.9rem', color: '#c084fc' }} />
          The next generation of bidding
        </motion.div>

        <h1
          className="text-glow"
          style={{
            margin: '0 0 1.25rem 0',
            padding: 0,
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1.08,
            color: isDark ? '#ffffff' : '#111827',
            position: 'relative', zIndex: 1,
          }}
        >
          <span style={{ display: 'block', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)' }}>
            Discover Premium
          </span>
          <span
            className="gradient-text"
            style={{
              display: 'block',
              fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            }}
          >
            Live Auctions
          </span>
        </h1>

        {/* Sub-text */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: isDark ? '#9ca3af' : '#4b5563',
          maxWidth: '42rem',
          margin: '0 auto',
          fontWeight: 300,
          lineHeight: 1.75,
        }}>
          Bid on exclusive items, track real-time prices, and secure magnificent pieces
          with BidZo's high-performance bidding engine.
        </p>
      </motion.section>

      {/* ── Auction Grid ── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0', gap: '1rem' }}>
          <Loader2 style={{ width: '3rem', height: '3rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#818cf8', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
            Loading Auctions
          </p>
        </div>
      ) : error ? (
        /* ── Error State ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{
            borderRadius: '1.5rem',
            padding: '4rem 2rem',
            textAlign: 'center',
            maxWidth: '40rem',
            margin: '0 auto',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ color: '#f87171', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Failed to load auctions
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={refetch}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.5rem',
              background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '0.75rem',
              color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: '0.9rem', height: '0.9rem' }} /> Try again
          </button>
        </motion.div>
      ) : auctions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          
          {/* Trending Section */}
          {trendingAuctions.length > 0 && (
            <motion.div
              initial="hidden" animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Flame style={{ width: '1.5rem', height: '1.5rem', color: '#ef4444' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: isDark ? '#f3f4f6' : '#111827' }}>Trending Now</h2>
                <span className="badge-urgent" style={{ marginLeft: 'auto', animation: 'none' }}>Ending Soon</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.75rem',
              }}>
                {trendingAuctions.map(auction => (
                  <motion.div key={auction.id} whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                    <AuctionCard auction={auction} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* All Auctions */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: isDark ? '#e5e7eb' : '#111827' }}>All Live Auctions</h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.75rem',
            }}>
          {auctions.map((auction) => (
            <motion.div
              key={auction.id}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } }
              }}
            >
              <AuctionCard auction={auction} />
              </motion.div>
            ))}
            </div>
          </motion.div>
        </div>
      ) : (
        /* ── Empty State ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{
            borderRadius: '1.5rem',
            padding: '5rem 2rem',
            textAlign: 'center',
            maxWidth: '40rem',
            margin: '0 auto',
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>🎨</div>
          <h3 style={{ color: isDark ? '#e5e7eb' : '#111827', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No active auctions
          </h3>
          <p style={{ color: isDark ? '#6b7280' : '#4b5563', fontSize: '1rem' }}>
            The gallery is currently empty. Be the first to create one!
          </p>
        </motion.div>
      )}
    </div>
  );
};

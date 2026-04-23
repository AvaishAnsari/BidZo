import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, TrendingUp } from 'lucide-react';
import type { Auction } from '../types';
import { formatCurrency } from '../utils/format';
import { useCountdown } from '../hooks/useCountdown';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge, SellerRating } from './TrustBadges';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface AuctionCardProps {
  auction: Auction;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
  // Live countdown — ticks every second
  const { timeLeft, isEnded: countdownEnded, isUrgent } = useCountdown(auction.end_time);
  const { isWatched, toggleWatchlist } = useWatchlist();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const isWatchedItem = isWatched(auction.id);
  const isOwnAuction = user?.id === auction.seller_id;
  const isEnded = countdownEnded || auction.status === 'ended';
  const isUpcoming =
    !isEnded &&
    (new Date(auction.start_time) > new Date() || auction.status === 'upcoming');
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="glass-card"
      style={{
        borderRadius: '1.25rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        cursor: 'pointer',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', background: isDark ? '#111827' : '#e5e7eb', flexShrink: 0 }}>
        {auction.image_url ? (
          <>
            {/* Skeleton while loading */}
            {!imgLoaded && (
              <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
            )}
            <img
              src={auction.image_url}
              alt={auction.title}
              onLoad={() => setImgLoaded(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: 'block', transition: 'transform 0.6s ease, opacity 0.4s',
                opacity: imgLoaded ? 1 : 0,
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.07)')}
              onMouseOut={e  => (e.currentTarget.style.transform = 'scale(1)')}
              onError={e => {
                // Hide broken img and show fallback sibling
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            {/* Fallback shown when img fails */}
            <div style={{
              display: 'none', width: '100%', height: '100%',
              alignItems: 'center', justifyContent: 'center',
              background: isDark ? 'linear-gradient(135deg, #1e1b4b 0%, #111827 100%)' : 'linear-gradient(135deg, #f3e8ff 0%, #e5e7eb 100%)',
              flexDirection: 'column', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '2.5rem' }}>🖼️</span>
              <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>{auction.title}</span>
            </div>
            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: isDark 
                ? 'linear-gradient(to top, rgba(3,7,18,0.85) 0%, rgba(3,7,18,0.2) 50%, transparent 100%)'
                : 'linear-gradient(to top, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            }} />
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: '0.875rem' }}>
            {t('noImage')}
          </div>
        )}

        {/* Watchlist Heart */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatchlist(auction.id); }}
          style={{
            position: 'absolute', top: '0.875rem', left: '0.875rem', zIndex: 10,
            background: isWatchedItem ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            border: isWatchedItem ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', padding: '0.5rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
             e.currentTarget.style.transform = 'scale(1.1)';
             if (!isWatchedItem) e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
          }}
          onMouseOut={(e) => {
             e.currentTarget.style.transform = 'scale(1)';
             if (!isWatchedItem) e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
          }}
          title={isWatchedItem ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isWatchedItem ? '#ef4444' : 'none'} stroke={isWatchedItem ? '#ef4444' : '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        {/* Status badge */}
        <div
          className={isEnded ? 'badge-ended' : isUpcoming ? 'badge-upcoming' : (isUrgent ? 'badge-urgent' : 'badge-live')}
          style={{
            position: 'absolute',
            top: '0.875rem',
            right: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Clock style={{ width: '0.75rem', height: '0.75rem' }} />
          {isEnded ? t('ended') : isUpcoming ? t('upcoming') : timeLeft}
        </div>
      </div>

      {/* Content */}
        <div style={{ padding: '1.25rem 1.35rem 1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          {auction.category && (
            <span style={{
              fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              background: 'rgba(99,102,241,0.12)', color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.22)',
              padding: '0.15rem 0.5rem', borderRadius: '9999px',
            }}>
              {auction.category}
            </span>
          )}
          {(auction.bid_count ?? 0) > 0 && (
            <span style={{
              fontSize: '0.64rem', fontWeight: 700,
              background: 'rgba(52,211,153,0.1)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.22)',
              padding: '0.15rem 0.5rem', borderRadius: '9999px',
            }}>
              {auction.bid_count} bids
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: isDark ? '#9ca3af' : '#4b5563', fontWeight: 500 }}>
            {t('verifiedSeller')}
          </span>
          <VerifiedBadge userId={auction.seller_id} />
        </div>

        <h3 style={{
          fontSize: '1.1rem', fontWeight: 700,
          color: isDark ? '#f3f4f6' : '#111827', margin: '0 0 0.5rem 0',
          lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {auction.title}
        </h3>

        {auction.description && (
          <p style={{
            color: isDark ? '#9ca3af' : '#374151', fontSize: '0.83rem', lineHeight: 1.65,
            margin: '0 0 1.25rem 0',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {auction.description}
          </p>
        )}

        <div style={{ marginBottom: '1.25rem' }}>
          <SellerRating userId={auction.seller_id} />
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: isDark ? '1px solid rgba(55,65,81,0.4)' : '1px solid rgba(209,213,219,0.8)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ color: isDark ? '#4b5563' : '#4b5563', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
              {t('currentBid')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp style={{ width: '1rem', height: '1rem', color: '#818cf8' }} />
              <motion.span
                key={auction.current_price}
                initial={{ filter: 'brightness(2) drop-shadow(0 0 10px rgba(52, 211, 153, 0.8))', color: '#34d399' }}
                animate={{ filter: 'brightness(1) drop-shadow(0 0 0px rgba(52, 211, 153, 0))', color: isDark ? '#f3f4f6' : '#1f2937' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className={isDark ? "" : "gradient-text"}
                style={{
                  fontSize: '1.3rem', fontWeight: 800,
                  ...(isDark ? {
                    background: 'linear-gradient(to right, #818cf8, #c084fc)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  } : {})
                }}
              >
                {formatCurrency(auction.current_price)}
              </motion.span>
            </div>
          </div>

          <Link
            to={`/auction/${auction.id}`}
            className={isEnded ? '' : isOwnAuction ? '' : 'btn-gradient'}
            style={{
              display: 'inline-block',
              padding: '0.55rem 1.1rem',
              borderRadius: '0.75rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s',
              ...(isEnded ? {
                background: isDark ? 'rgba(31,41,55,0.6)' : '#e5e7eb',
                color: isDark ? '#6b7280' : '#374151',
                border: isDark ? '1px solid rgba(55,65,81,0.5)' : '1px solid #d1d5db',
              } : isOwnAuction ? {
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#ffffff',
                border: '1px solid rgba(59,130,246,0.5)',
                boxShadow: '0 0 15px rgba(59,130,246,0.2)',
              } : {}),
            }}
          >
            {isEnded ? t('viewResults') : isOwnAuction ? t('manageAuction') : `${t('placeBid')} →`}
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, TrendingUp } from 'lucide-react';
import type { Auction } from '../types';
import { formatCurrency } from '../utils/format';
import { useCountdown } from '../hooks/useCountdown';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

interface AuctionCardProps {
  auction: Auction;
}

const AuctionCardStatus: React.FC<{ endTime: string; status: string; startTime: string; moderationStatus?: string }> = ({ endTime, status, startTime, moderationStatus }) => {
  if (moderationStatus === 'PENDING_REVIEW') {
    return (
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-amber-500/15 text-amber-400 font-bold text-[11px] px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-amber-500/30">
        <Clock className="w-3 h-3" />
        Pending Review
      </div>
    );
  }

  if (moderationStatus === 'REJECTED') {
    return (
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/15 text-red-400 font-bold text-[11px] px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-red-500/30">
        <Clock className="w-3 h-3" />
        Rejected
      </div>
    );
  }

  const { timeLeft, isEnded: countdownEnded } = useCountdown(endTime);
  const isEnded = countdownEnded || status === 'ended';
  const isUpcoming = !isEnded && (new Date(startTime) > new Date() || status === 'upcoming');

  if (isEnded) {
    return (
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/10 text-red-500 font-bold text-[11px] px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-red-500/20">
        <Clock className="w-3 h-3" />
        Ended
      </div>
    );
  }

  if (isUpcoming) {
    return (
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-blue-500/10 text-blue-500 font-bold text-[11px] px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-blue-500/20">
        <Clock className="w-3 h-3" />
        Upcoming
      </div>
    );
  }

  return (
    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 font-bold text-[11px] px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-emerald-500/20">
      <Clock className="w-3 h-3" />
      {timeLeft}
    </div>
  );
};

const AuctionCardAction: React.FC<{ auction: Auction; isOwnAuction: boolean }> = ({ auction, isOwnAuction }) => {
  if (auction.moderation_status === 'PENDING_REVIEW') {
    return (
      <Link
        to={`/auction/${auction.id}`}
        className="bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 font-bold text-xs px-4 py-2 rounded-xl transition-colors no-underline flex items-center gap-1"
      >
        In Review &rarr;
      </Link>
    );
  }

  const { isEnded: countdownEnded } = useCountdown(auction.end_time);

  const isEnded = countdownEnded || auction.status === 'ended';

  if (isEnded) {
    return (
      <Link
        to={`/auction/${auction.id}`}
        className="bg-[var(--elevated)] text-[var(--text-main)] hover:bg-[var(--border)] font-bold text-xs px-4 py-2 rounded-xl transition-colors no-underline flex items-center gap-1 border border-[var(--border)]"
      >
        View Results &rarr;
      </Link>
    );
  }

  if (isOwnAuction) {
    return (
      <Link
        to={`/auction/${auction.id}`}
        className="bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 font-bold text-xs px-4 py-2 rounded-xl transition-colors no-underline flex items-center gap-1"
      >
        Manage Auction &rarr;
      </Link>
    );
  }

  return (
    <Link
      to={`/auction/${auction.id}`}
      className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-bold text-xs px-4 py-2 rounded-xl shadow-md hover:shadow-lg shadow-[var(--primary)]/20 transition-all no-underline flex items-center gap-1"
    >
      View Auction &rarr;
    </Link>
  );
};

export const AuctionCard: React.FC<AuctionCardProps> = React.memo(({ auction }) => {
  const { isWatched, toggleWatchlist } = useWatchlist();
  const { user } = useAuth();

  const isWatchedItem = isWatched(auction.id);
  const isOwnAuction = !!(
    user &&
    auction &&
    (
      String(auction.seller_id) === String(user.id) ||
      Number(auction.seller_id) === Number(user.id) ||
      (auction.seller_name && user.username && auction.seller_name === user.username) ||
      (auction.seller_name && user.email && auction.seller_name === user.email)
    )
  );
  const [imgLoaded, setImgLoaded] = useState(false);
  const navigate = useNavigate();

  return (
    <motion.div
      onClick={() => navigate(`/auction/${auction.id}`)}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="market-card flex flex-col h-full overflow-hidden cursor-pointer group"
    >
      {/* Image */}
      <div className="relative w-full h-[220px] bg-[var(--elevated)] shrink-0 overflow-hidden">
        {auction.image_url ? (
          <>
            {/* Skeleton while loading */}
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton" />
            )}
            <img
              src={auction.image_url}
              alt={auction.title}
              onLoad={() => setImgLoaded(true)}
              className="w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105"
              style={{ opacity: imgLoaded ? 1 : 0 }}
              onError={e => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            {/* Fallback shown when img fails */}
            <div className="hidden w-full h-full items-center justify-center flex-col gap-2 bg-[var(--elevated)]">
              <span className="text-4xl">🖼️</span>
              <span className="text-[var(--text-muted)] text-xs">{auction.title}</span>
            </div>
            {/* Gradient overlay for better contrast on badges */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/80 via-transparent to-transparent pointer-events-none opacity-60" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--elevated)]">
            <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mb-2">
              <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-semibold">No Image Available</span>
          </div>
        )}

        {/* Watchlist Heart */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatchlist(auction.id); }}
          className={`absolute top-3 left-3 z-10 w-9 h-9 rounded-full cursor-pointer flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
            isWatchedItem
              ? 'bg-[var(--danger)]/20 border border-[var(--danger)]/50'
              : 'bg-black/40 border border-white/20 hover:bg-black/60 hover:scale-110'
          }`}
          title={isWatchedItem ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isWatchedItem ? '#ef4444' : 'none'} stroke={isWatchedItem ? '#ef4444' : '#ffffff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        {/* Status badge */}
        <AuctionCardStatus endTime={auction.end_time} status={auction.status} startTime={auction.start_time} moderationStatus={auction.moderation_status} />

        {/* Multiple photos badge */}
        {auction.images && auction.images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-white border border-white/15 z-10 flex items-center gap-1 shadow">
            <span>📷</span>
            <span>{auction.images.length}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {auction.category && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#3b82f6] mb-2">
            {auction.category}
          </span>
        )}
        <h3 className="text-[17px] font-extrabold text-[var(--text-main)] m-0 mb-1.5 leading-tight line-clamp-2">
          {auction.title}
        </h3>

        {auction.description && (
          <p className="text-[var(--text-muted)] text-[13px] leading-relaxed m-0 mb-4 line-clamp-2">
            {auction.description}
          </p>
        )}

        <div className="flex items-center gap-4 mb-4 mt-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
            {auction.bid_count ?? 0} bids
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            1.2K views
          </div>
        </div>

        <div className="mt-4 flex justify-between items-end">
          <div>
            <p className="text-[var(--text-muted)] text-[11px] font-medium m-0 mb-1">
              Current Bid
            </p>
            <div className="flex items-center gap-1.5">
              <motion.span
                key={auction.current_price}
                initial={{ color: 'var(--success)' }}
                animate={{ color: 'var(--text-main)' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="text-[22px] font-black"
              >
                {formatCurrency(auction.current_price)}
              </motion.span>
            </div>
          </div>

          <AuctionCardAction auction={auction} isOwnAuction={isOwnAuction} />
        </div>
      </div>
    </motion.div>
  );
});

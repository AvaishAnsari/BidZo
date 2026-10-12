import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { useAuction } from '../hooks/useAuction';
import { useWatchlist } from '../hooks/useWatchlist';
import { VerifiedBadge, SellerRating } from '../components/TrustBadges';
import { SmartBidAssistant } from '../components/SmartBidAssistant';
import { generateMockTxHash, shortenTxHash, copyToClipboard } from '../utils/blockchain';
import { placeBidRPC } from '../services/bidService';
import { closeAuctionRPC } from '../services/auctionService';
import { API_ROOT_URL } from '../services/api';

import { formatCurrency, maskEmail, timeAgo } from '../utils/format';
import { predictFinalBid } from '../utils/ai';
import {
  Loader2, Clock, TrendingUp, ArrowLeft, Flame,
  AlertCircle, Trophy, RefreshCw, Zap, Bell, Copy, ShieldCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { BidHistoryModal } from '../components/BidHistoryModal';
import { useTranslation } from 'react-i18next';

// ── Sub-component: single countdown tile ─────────────────────────
const TimeBlock = ({ value, label, urgent }: { value: number; label: string; urgent?: boolean }) => (
  <div className="text-center">
    <div className={`px-4 py-3 min-w-[60px] rounded-xl mb-1.5 transition-all ${
      urgent
        ? 'bg-[var(--danger)]/10 border border-[var(--danger)]/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
        : 'bg-[var(--elevated)] border border-[var(--border)] shadow-sm'
    }`}>
      <span className={`text-3xl font-extrabold leading-none block ${urgent ? 'text-[var(--danger)]' : 'text-[var(--text-main)]'}`}>
        {String(value).padStart(2, '0')}
      </span>
    </div>
    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
      {label}
    </span>
  </div>
);

// ── Anti-snipe constants ──────────────────────────────────────────────
const SNIPE_WINDOW_MS  = 30_000; // 30 seconds
const SNIPE_MAX        = 3;       // max extensions

// ── Main page ─────────────────────────────────────────────────────
export const AuctionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWatched, toggleWatchlist } = useWatchlist();
  const { t } = useTranslation();

  const {
    auction,
    bids,
    isLoading,
    error,
    parts,
    isEnded,
    isUpcoming,
    minBid,
    refetch,
    applyBidOptimistic,
  } = useAuction(id);

  const [bidAmount, setBidAmount]     = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  const [isBidHistoryModalOpen, setIsBidHistoryModalOpen] = useState(false);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | ''>('');
  const [isFetchingAddresses, setIsFetchingAddresses] = useState(false);

  // ── Multi-image gallery state ──────────────────────────────────────────────
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [auction?.id]);

  const auctionImages = (auction?.images && auction.images.length > 0)
    ? auction.images
    : (auction?.image_url ? [auction.image_url] : []);
  const activeImage = auctionImages[activeImageIndex] || auction?.image_url;

  // ── Step 4: Winning / Outbid state ─────────────────────────────────────────
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
  const isWinning    = isEnded && auction?.winner_id
    ? auction.winner_id === user?.id
    : !!(user && bids.length > 0 && bids[0].user_email === (user?.email ?? ''));

  const prevTopBidRef = useRef<string | null>(null);

  // ── Step 5a: Outbid toast ─────────────────────────────────────────
  useEffect(() => {
    if (!user || bids.length === 0) return;
    const topEmail = bids[0].user_email;
    const userEmail = user.email ?? '';

    // Only fire if we were previously the top bidder and got outbid
    if (
      prevTopBidRef.current === userEmail &&
      topEmail !== userEmail
    ) {
      toast.error(`You've been outbid! New top: ${formatCurrency(bids[0].amount)}`, {
        icon: '🔔',
        duration: 5000,
      });
    }
    prevTopBidRef.current = topEmail;
  }, [bids, user]);

  // ── Step 5b: Ending-soon toast (fires once when < 60s left) ──────
  const endingSoonFiredRef = useRef(false);
  useEffect(() => {
    if (!auction || isEnded || isUpcoming) return;
    const msLeft = new Date(auction.end_time).getTime() - Date.now();
    if (msLeft > 0 && msLeft <= 60_000 && !endingSoonFiredRef.current) {
      endingSoonFiredRef.current = true;
      toast(`⏰ Auction ending in under 1 minute!`, {
        style: { background: '#1e1b4b', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' },
        duration: 6000,
      });
    }
    // Reset if time goes back (e.g. after anti-snipe extension)
    if (msLeft > 60_000) endingSoonFiredRef.current = false;
  }, [parts, auction, isEnded, isUpcoming]);

  // ── Step 5c: Atomic Back-end Closure Trigger ─────────────────────────────
  const closureFiredRef = useRef(false);
  useEffect(() => {
    if (isEnded && auction && auction.status !== 'ended' && !closureFiredRef.current) {
      closureFiredRef.current = true;
      console.log('Timer expired. Requesting atomic formal closure from PostgreSQL...');
      closeAuctionRPC(auction.id).then((res) => {
         if (res.success) {
           console.log('Auction formally locked securely.');
           refetch(); // Pull the newly settled winner_id state
         }
      });
    }
  }, [isEnded, auction, refetch]);

  // ── Step 5c: Won toast (fires when auction just ended and user was winning) ──
  const wonFiredRef = useRef(false);
  useEffect(() => {
    if (isEnded && isWinning && !wonFiredRef.current) {
      wonFiredRef.current = true;
      toast.success(`🏆 Congratulations! You won this auction for ${formatCurrency(auction?.current_price ?? 0)}!`, {
        duration: 8000,
      });
    }
  }, [isEnded, isWinning, auction]);

  useEffect(() => {
    if (isEnded && isWinning && user) {
      const fetchAddresses = async () => {
        try {
          setIsFetchingAddresses(true);
          const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
          const apiUrl = API_ROOT_URL;
          const res = await fetch(`${apiUrl}/api/users/me/addresses/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setAddresses(data);
            const defaultAddr = data.find((a: any) => a.is_default);
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
            else if (data.length > 0) setSelectedAddressId(data[0].id);
          }
        } catch (err) {
          console.error("Failed to load addresses", err);
        } finally {
          setIsFetchingAddresses(false);
        }
      };
      fetchAddresses();
    }
  }, [isEnded, isWinning, user]);

  const applyAntiSnipe = (auctionEndTime: string): boolean => {
    const msLeft = new Date(auctionEndTime).getTime() - Date.now();
    if (msLeft > SNIPE_WINDOW_MS) return false; // not in snipe window

    const count = auction?.extension_count ?? 0;
    if (count >= SNIPE_MAX) return false; // max extensions reached

    // Supabase/Django mode — anti-sniping should ideally be handled server-side.
    // For now, trigger optimistic re-render.
    applyBidOptimistic(auction!.current_price, ''); // no-op price, just trigger re-render
    return false;
  };

  // ── Bid submission ────────────────────────────────────────────────
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacingBid) return;
    if (!user) {
      toast.error('Please log in to place a bid', { id: 'bid-error' });
      navigate('/login');
      return;
    }
    // Sellers cannot bid on their own auctions
    if (isOwnAuction) {
      toast.error('You cannot place a bid on your own auction.', { id: 'bid-error' });
      return;
    }
    // Prevent submitting bid against self
    if (isWinning) {
      toast.error('You already have the highest bid', { id: 'bid-error' });
      return;
    }
    if (!auction) return;

    const amount = parseFloat(bidAmount);


    if (isNaN(amount) || amount <= auction.current_price) {
      toast.error(`Bid must be higher than ${formatCurrency(auction.current_price)}`, { id: 'bid-error' });
      return;
    }

    if (isEnded) {
      toast.error('This auction has already ended', { id: 'bid-error' });
      return;
    }

    if (isUpcoming) {
      toast.error('This auction has not started yet', { id: 'bid-error' });
      return;
    }

    setIsPlacingBid(true);
    try {
      // ── Django API mode ─────────────────────────────────────────────
      const result = await placeBidRPC(auction.id, amount);

      if (!result.success) {
        toast.error(result.message || 'Failed to place bid', { id: 'bid-error' });
        return;
      }

      applyBidOptimistic(amount, user.email ?? 'You');
      applyAntiSnipe(auction.end_time);
      setBidAmount('');
      toast.success('Bid placed successfully! 🎉', { id: 'bid-success' });
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred', { id: 'bid-error' });
    } finally {
      setIsPlacingBid(false);
    }
  };



  // ── Derived: is auction ending soon? (< 5 mins) ──────────────────────
  const msLeft  = auction ? new Date(auction.end_time).getTime() - Date.now() : Infinity;
  const urgentTimer = !isEnded && !isUpcoming && msLeft <= 300_000 && msLeft > 0;

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
        <p className="text-[var(--primary)] text-sm tracking-[0.1em] uppercase font-bold">Loading Auction...</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error || !auction) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="text-5xl">⚠️</div>
        <p className="text-[var(--danger)] font-bold">{error || 'Auction not found'}</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-transparent border border-[var(--border)] rounded-xl text-[var(--text-muted)] cursor-pointer text-sm hover:border-[var(--text-main)] transition-colors"
          >
            ← Back to Auctions
          </button>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)]/15 border border-[var(--primary)]/40 rounded-xl text-[var(--primary)] cursor-pointer text-sm font-bold hover:bg-[var(--primary)]/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div className="py-8 w-full">
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-[var(--text-muted)] bg-transparent border-none cursor-pointer text-sm font-medium mb-8 py-2 hover:text-[var(--text-main)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Auctions
        </button>
      </motion.div>

      {auction.moderation_status === 'PENDING_REVIEW' && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-3 text-amber-300 text-sm">
          <Clock className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <span className="font-bold">Pending Admin Moderation:</span> This auction listing is currently under review by administrators. Once approved, it will be visible to buyers and can receive bids.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Main 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-start">

          {/* LEFT — Image + Details */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Image Gallery */}
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] mb-3 bg-[var(--surface)] aspect-[4/3] relative group">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={auction.title}
                  className="w-full h-full object-cover block transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                  No Image
                </div>
              )}

              {/* Prev / Next controls for multiple images */}
              {auctionImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : auctionImages.length - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg cursor-pointer"
                    title="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex((prev) => (prev < auctionImages.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg cursor-pointer"
                    title="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Photo counter */}
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-semibold text-white border border-white/15 shadow">
                    📸 {activeImageIndex + 1} / {auctionImages.length}
                  </div>
                </>
              )}

              {/* Status Badge */}
              <div className={`absolute top-4 left-4 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md border ${
                isEnded ? 'bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30' :
                isUpcoming ? 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30' :
                'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current block" />
                {isEnded ? 'Ended' : isUpcoming ? 'Upcoming' : 'Live'}
              </div>

              {/* Extension badge */}
              {(auction.extension_count ?? 0) > 0 && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Extended ×{auction.extension_count}
                </div>
              )}

              {/* Watchlist Heart */}
              {auction && (
                <button
                  onClick={() => toggleWatchlist(auction.id)}
                  className={`absolute top-4 z-10 p-2 rounded-full cursor-pointer flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
                    (auction.extension_count ?? 0) > 0 ? 'right-32' : 'right-4'
                  } ${
                    isWatched(auction.id)
                      ? 'bg-[var(--danger)]/20 border border-[var(--danger)]/50'
                      : 'bg-black/40 border border-white/20 hover:bg-black/60 hover:scale-110'
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isWatched(auction.id) ? '#ef4444' : 'none'} stroke={isWatched(auction.id) ? '#ef4444' : '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
              )}
            </div>

            {/* Thumbnail Strip */}
            {auctionImages.length > 1 && (
              <div className="flex items-center gap-2.5 mb-6 overflow-x-auto pb-2 scrollbar-thin">
                {auctionImages.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-black/40 ${
                      idx === activeImageIndex
                        ? 'border-brand-500 ring-2 ring-brand-500/40 scale-105 shadow-md'
                        : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${auction.title} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Description Card */}
            <div className="market-card p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-[var(--text-muted)] font-medium">Verified Seller</span>
                <VerifiedBadge userId={auction.seller_id} />
                <div className="ml-4">
                  <SellerRating userId={auction.seller_id} />
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] mb-3 leading-tight">
                {auction.title}
              </h1>
              <p className="text-[var(--text-muted)] leading-relaxed text-base">
                {auction.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
                <div>
                  <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-1 font-bold">Starting Bid</p>
                  <p className="text-[var(--text-main)] font-bold text-lg">{formatCurrency(auction.start_price)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Bidding Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col gap-5"
          >
            {/* ── Step 2: Current Bid (real-time animated) ─────────────── */}
            <div className="market-card rounded-2xl p-6 text-center">
              <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5 font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--primary)]" />
                {t('currentBid')}
              </p>
              <div className="relative inline-block">
                <motion.p
                  key={auction.current_price}
                  initial={{ scale: 1.15, filter: 'brightness(2) drop-shadow(0 0 15px rgba(52, 211, 153, 0.9))' }}
                  animate={{ scale: 1, filter: 'brightness(1) drop-shadow(0 0 0px rgba(52, 211, 153, 0))' }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="text-5xl font-black bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent leading-none m-0"
                >
                  {formatCurrency(auction.current_price)}
                </motion.p>
                {/* Floating "NEW BID" Indicator */}
                <motion.div
                  key={`badge-${auction.current_price}`}
                  initial={{ opacity: 1, y: -10, scale: 0.8 }}
                  animate={{ opacity: 0, y: -40, scale: 1.1 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="absolute -top-4 -right-5 bg-[var(--success)]/20 border border-[var(--success)]/50 text-[var(--success)] px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase shadow-[0_0_10px_rgba(52,211,153,0.3)] pointer-events-none z-10"
                >
                  New Bid 🔥
                </motion.div>
              </div>

              {/* AI Prediction Box */}
              {!isEnded && !isUpcoming && (
                <div className="mt-4 bg-[var(--primary)]/5 rounded-xl p-3 border border-dashed border-[var(--primary)]/30">
                  <p className="m-0 text-xs text-[var(--primary)] flex items-center justify-center gap-1 uppercase tracking-wide font-bold">
                    <Zap className="w-3.5 h-3.5" /> AI Predicted Final Bid
                  </p>
                  <p className="mt-1 mb-0 text-xl font-extrabold text-[var(--text-main)]">
                    {formatCurrency(predictFinalBid(auction.current_price, auction.start_price, msLeft, bids.length))}
                  </p>
                </div>
              )}

              {/* ── Step 4: Winning / Outbid indicator ───────────────── */}
              {user && bids.length > 0 && (
                <AnimatePresence mode="wait">
                  {isWinning ? (
                    <motion.div
                      key="winning"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-xs font-bold"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      You are winning!
                    </motion.div>
                  ) : (
                    <motion.div
                      key="outbid"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--danger)]/10 border border-[var(--danger)]/25 text-[var(--danger)] text-xs font-bold"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      You have been outbid
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Countdown Timer */}
            {!isEnded && (
              <div className={`market-card rounded-2xl p-5 ${urgentTimer ? 'bg-[var(--danger)]/5 border-[var(--danger)]/30' : ''}`}>
                <p className={`text-xs uppercase tracking-widest mb-4 flex items-center gap-1.5 font-bold ${urgentTimer ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                  <Clock className={`w-3.5 h-3.5 ${urgentTimer ? 'text-[var(--danger)]' : 'text-[var(--primary)]'}`} />
                  {isUpcoming ? 'Starts In' : urgentTimer ? '⚡ Ending Soon!' : 'Time Remaining'}
                  {/* Anti-snipe extensions indicator */}
                  {(auction.extension_count ?? 0) < SNIPE_MAX && !isEnded && !isUpcoming && (
                    <span className="ml-auto text-[10px] text-[var(--text-muted)] font-medium">
                      Anti-snipe: {SNIPE_MAX - (auction.extension_count ?? 0)} ext. left
                    </span>
                  )}
                </p>
                <div className="flex gap-3 justify-center">
                  <TimeBlock value={parts.days}    label="Days"  urgent={urgentTimer} />
                  <div className="text-[var(--text-muted)] text-2xl font-light pt-2">:</div>
                  <TimeBlock value={parts.hours}   label="Hours" urgent={urgentTimer} />
                  <div className="text-[var(--text-muted)] text-2xl font-light pt-2">:</div>
                  <TimeBlock value={parts.minutes} label="Min"   urgent={urgentTimer} />
                  <div className="text-[var(--text-muted)] text-2xl font-light pt-2">:</div>
                  <TimeBlock value={parts.seconds} label="Sec"   urgent={urgentTimer} />
                </div>
              </div>
            )}

            {/* Ended Banner */}
            {isEnded && (
              <div className={`rounded-2xl p-5 flex flex-col gap-4 border ${
                isWinning
                  ? 'bg-[var(--primary)]/10 border-[var(--primary)]/40'
                  : 'bg-[var(--danger)]/5 border-[var(--danger)]/25'
              }`}>
                <div className="flex items-center gap-3">
                  <Trophy className={`w-6 h-6 shrink-0 ${isWinning ? 'text-yellow-500' : 'text-[var(--text-muted)]'}`} />
                  <div>
                    <p className={`font-bold text-[15px] m-0 ${isWinning ? 'text-yellow-500' : 'text-[var(--text-muted)]'}`}>
                      {isWinning ? 'You Won This Auction! 🎉' : 'Auction Ended'}
                    </p>
                    <p className="text-[var(--text-muted)] text-[13px] mt-1 m-0">
                      Final price: {formatCurrency(auction.current_price)}
                    </p>
                  </div>
                </div>
              </div>
            )}



            {/* ── Winner Order Action ── */}
            {isEnded && isWinning && !isOwnAuction && (
              <div className="market-card rounded-2xl p-6 bg-[var(--success)]/10 border border-[var(--success)]/30 mb-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <Trophy className="w-12 h-12 text-[var(--success)] mb-3" />
                  <h3 className="text-xl font-bold text-[var(--success)] mb-2">Congratulations! You won!</h3>
                  <p className="text-[var(--text-muted)] text-[14px] mb-5">
                    You successfully won this auction for {formatCurrency(auction.current_price)}.
                  </p>

                  {isFetchingAddresses ? (
                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading addresses...
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 p-4 rounded-xl mb-4 w-full text-[13px] text-[var(--warning)]">
                      You need to add a delivery address before you can claim your order.
                      <Link to="/profile" className="block mt-2 font-bold hover:underline">Go to Profile →</Link>
                    </div>
                  ) : (
                    <div className="w-full text-left mb-4 bg-[var(--bg)] p-4 rounded-xl border border-[var(--border)]">
                      <label className="block text-[13px] text-[var(--text-muted)] font-bold mb-2">Select Delivery Address</label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                        className="w-full bg-[var(--elevated)] border border-[var(--border)] text-[var(--text-main)] rounded-lg p-3 text-sm focus:outline-none focus:border-[var(--primary)]"
                      >
                        {addresses.map(addr => (
                          <option key={addr.id} value={addr.id}>
                            {addr.full_name} - {addr.city} ({addr.address_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    disabled={!selectedAddressId}
                    onClick={async () => {
                      if (!selectedAddressId) return;
                      try {
                        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
                        const apiUrl = API_ROOT_URL;
                        const res = await fetch(`${apiUrl}/api/auctions/${auction.id}/order/`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ delivery_address_id: selectedAddressId })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          window.location.href = `/order/${data.data.id}`;
                        } else {
                          alert(data.error || "Failed to process order.");
                        }
                      } catch (err) {
                        alert("An error occurred processing the order.");
                      }
                    }}
                    className={`font-bold py-3.5 px-8 rounded-xl transition-all w-full md:w-auto ${
                      !selectedAddressId
                      ? 'bg-[var(--elevated)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                      : 'bg-[var(--success)] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 cursor-pointer'
                    }`}
                  >
                    View Order Details & Pay
                  </button>
                </div>
              </div>
            )}

            {!isEnded && !isUpcoming && !isOwnAuction && (
              <div className="market-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Flame className="w-4.5 h-4.5 text-[var(--primary)]" />
                  <h3 className="text-[var(--text-main)] font-bold text-base m-0">Place Your Bid</h3>
                </div>

                {!user && (
                  <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-xl p-3.5 flex items-center gap-2.5 mb-4">
                    <AlertCircle className="w-4 h-4 text-[var(--warning)] shrink-0" />
                    <p className="text-[var(--text-muted)] text-[13px] m-0">
                      <Link to="/login" className="text-[var(--primary)] font-semibold hover:underline">Sign in</Link>
                      {' '}to place a bid
                    </p>
                  </div>
                )}

                {user && (
                  <SmartBidAssistant
                    currentPrice={auction.current_price}
                    minIncrement={50}
                    timeRemainingMs={msLeft}
                    bidCount={bids.length}
                    onSelectBid={(amount: number) => setBidAmount(amount.toString())}
                  />
                )}

                <form onSubmit={handlePlaceBid}>
                  <div className="mb-4">
                    <label className="flex justify-between text-[var(--text-muted)] text-[13px] mb-1.5">
                      <span>Your Bid Amount</span>
                      <span className="text-[var(--primary)] font-semibold">Min {formatCurrency(minBid)}</span>
                    </label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[15px] ${isWinning ? 'text-[var(--text-muted)]' : 'text-[var(--primary)]'}`}>
                        ₹
                      </span>
                      <input
                        type="number"
                        min={minBid}
                        step="0.01"
                        required
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        placeholder={String(minBid)}
                        className={`w-full pl-10 pr-4 py-3.5 rounded-xl text-base font-semibold outline-none transition-colors ${
                          isWinning
                            ? 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                            : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] focus:border-[var(--primary)]'
                        }`}
                        disabled={!user || isPlacingBid || isWinning}
                      />
                    </div>
                    {/* Real-time frontend validation feedback */}
                    <AnimatePresence>
                      {isWinning && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 text-[var(--success)] text-xs flex items-center gap-1.5"
                        >
                          <Trophy className="w-3 h-3" />
                          You already have the highest bid!
                        </motion.div>
                      )}
                      {!isWinning && bidAmount !== '' && (parseFloat(bidAmount) <= auction.current_price || isNaN(parseFloat(bidAmount))) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 text-[var(--danger)] text-xs flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Bid must be higher than {formatCurrency(auction.current_price)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={!user || isPlacingBid || isWinning || (bidAmount !== '' && parseFloat(bidAmount) <= auction.current_price)}
                    whileHover={{ scale: (!user || isPlacingBid || isWinning) ? 1 : 1.02 }}
                    whileTap={{ scale: (!user || isPlacingBid || isWinning) ? 1 : 0.97 }}
                    className={`w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isWinning
                        ? 'bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)]'
                        : user && !(bidAmount !== '' && parseFloat(bidAmount) <= auction.current_price)
                          ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] border-none'
                          : 'bg-[var(--elevated)] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {isPlacingBid ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Placing Bid...</>
                    ) : isWinning ? (
                      isEnded
                        ? <><Trophy className="w-4 h-4" /> You won this auction</>
                        : <><Trophy className="w-4 h-4" /> Top Bidder</>
                    ) : (
                      <><Flame className="w-4 h-4" /> {t('placeBid')}</>
                    )}
                  </motion.button>
                </form>
              </div>
            )}

            {/* Seller owns this listing — show info panel instead of bid form */}
            {!isEnded && !isUpcoming && isOwnAuction && (
              <div className="market-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full shrink-0 bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[1.1rem]">🏷️</div>
                  <div>
                    <p className="text-[var(--primary)] font-bold text-[15px] m-0">
                      Your Listing Dashboard
                    </p>
                    <p className="text-[var(--text-muted)] text-[12px] mt-0.5 m-0">
                      You created this auction. Sellers cannot bid on their own listings.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
                    <div className="bg-[var(--bg)] rounded-xl p-3 text-center">
                      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest mb-1 m-0 font-bold">Total Bids</p>
                      <p className="text-[var(--text-main)] font-extrabold text-2xl m-0">{bids.length}</p>
                    </div>
                    <div className="bg-[var(--bg)] rounded-xl p-3 text-center">
                      <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest mb-1 m-0 font-bold">Current Price</p>
                      <p className="text-[var(--primary)] font-extrabold text-base m-0 leading-[2.5rem]">{formatCurrency(auction.current_price)}</p>
                    </div>
                  </div>
              </div>
            )}
            {isUpcoming && (
              <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/25 rounded-2xl p-5 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[var(--warning)] shrink-0" />
                <div>
                  <p className="text-[var(--warning)] font-bold text-[15px] m-0">Auction Not Started</p>
                  <p className="text-[var(--text-muted)] text-[13px] mt-0.5 m-0">Bidding will open when the countdown begins.</p>
                </div>
              </div>
            )}

            {/* ── Step 1: Transparent Ledger ──────────────────── */}
            <div className="market-card rounded-2xl p-6 border border-[var(--success)]/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[var(--text-main)] font-bold text-[15px] flex items-center gap-2 m-0">
                  <ShieldCheck className="w-5 h-5 text-[var(--success)]" />
                  Transparent Bid Ledger 🔗
                </h3>
                {bids.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 rounded-full px-2.5 py-1 uppercase tracking-wide">
                      Top {Math.min(bids.length, 10)}
                    </span>
                    <button
                      onClick={() => setIsBidHistoryModalOpen(true)}
                      className="text-[12px] font-bold bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/40 rounded-lg px-3 py-1 cursor-pointer transition-all hover:bg-[var(--primary)]/25 hover:scale-105"
                    >
                      View All Bids
                    </button>
                  </div>
                )}
              </div>

              {/* Empty state */}
              {bids.length === 0 ? (
                <div className="text-center py-6">
                  <Flame className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="text-[var(--text-muted)] text-[13px] m-0">No bids yet — be the first!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <AnimatePresence initial={false}>
                    {bids.slice(0, 10).map((bid, i) => {
                      const isMe = user?.email === bid.user_email;
                      return (
                        <motion.div
                          key={bid.id}
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25 }}
                          className={`grid grid-cols-[1fr_auto] items-center gap-2 p-3 rounded-xl border ${
                            i === 0
                              ? isMe
                                ? 'bg-[var(--success)]/10 border-[var(--success)]/30'
                                : 'bg-[var(--primary)]/10 border-[var(--primary)]/30'
                              : 'bg-[var(--bg)] border-[var(--border)] opacity-80'
                          }`}
                        >
                          {/* Left — rank + bidder + time */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              i === 0
                                ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                                : 'bg-[var(--elevated)] text-[var(--text-muted)] border border-[var(--border)]'
                            }`}>
                              #{i + 1}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-[13px] font-semibold truncate flex items-center gap-2 ${
                                i === 0 ? (isMe ? 'text-[var(--success)]' : 'text-[var(--primary)]') : 'text-[var(--text-muted)]'
                              }`}>
                                {isMe ? 'You' : maskEmail(bid.user_email)}
                                {i === 0 && (
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                                    isMe
                                      ? 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/30'
                                      : 'text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/30'
                                  }`}>
                                    {isMe ? '🏆 WINNING' : 'HIGHEST'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-2">
                                <span>{timeAgo(bid.created_at)}</span>
                                <span className="opacity-50">•</span>
                                <button
                                  onClick={() => copyToClipboard(generateMockTxHash(bid.id), 'Transaction Hash')}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer text-[10px] font-mono transition-colors border ${
                                    i === 0
                                      ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/20'
                                      : 'bg-[var(--elevated)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--border)]'
                                  }`}
                                  title="Verified on Chain (Copy Tx Hash)"
                                >
                                  <Copy className="w-3 h-3" />
                                  {shortenTxHash(generateMockTxHash(bid.id))}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right — amount */}
                          <span className={`font-bold text-[15px] whitespace-nowrap ${
                            i === 0 ? (isMe ? 'text-[var(--success)]' : 'text-[var(--primary)]') : 'text-[var(--text-main)]'
                          }`}>
                            {formatCurrency(bid.amount)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <BidHistoryModal
        isOpen={isBidHistoryModalOpen}
        onClose={() => setIsBidHistoryModalOpen(false)}
        auctionId={id ?? ''}
        currentUserEmail={user?.email}
      />
    </div>
  );
};

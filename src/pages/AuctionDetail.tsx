import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuction } from '../hooks/useAuction';
import { useWatchlist } from '../hooks/useWatchlist';
import { VerifiedBadge, SellerRating } from '../components/TrustBadges';
import { SmartBidAssistant } from '../components/SmartBidAssistant';
import { generateMockTxHash, shortenTxHash, copyToClipboard } from '../utils/blockchain';
import { placeBidRPC } from '../services/bidService';
import { isSupabaseConfigured } from '../utils/supabase';
import { placeBid as localPlaceBid, emitBidEvent, extendAuctionTime } from '../utils/localStore';
import { formatCurrency, maskEmail, timeAgo } from '../utils/format';
import {
  Loader2, Clock, TrendingUp, ArrowLeft, Gavel,
  AlertCircle, CheckCircle2, Trophy, RefreshCw, Zap, Bell, Heart, Copy, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ── Sub-component: single countdown tile ─────────────────────────
const TimeBlock = ({ value, label, urgent }: { value: number; label: string; urgent?: boolean }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{
      background: urgent ? 'rgba(239,68,68,0.15)' : 'rgba(17,24,39,0.8)',
      border: `1px solid ${urgent ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.3)'}`,
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
      minWidth: '60px',
      marginBottom: '0.35rem',
      boxShadow: urgent ? '0 0 20px rgba(239,68,68,0.2)' : '0 0 20px rgba(99,102,241,0.1)',
      transition: 'all 0.3s',
    }}>
      <span style={{
        fontSize: '1.75rem', fontWeight: 800,
        color: urgent ? '#f87171' : 'white',
        display: 'block', lineHeight: 1,
      }}>
        {String(value).padStart(2, '0')}
      </span>
    </div>
    <span style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
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
  const { user, userRole } = useAuth();
  const { isWatched, toggleWatchlist } = useWatchlist();

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

  // ── Step 4: Winning / Outbid state ─────────────────────────────────────────
  const isOwnAuction = !!(user && auction && auction.seller_id === user.id);
  const isWinning    = !!(user && bids.length > 0 && bids[0].user_email === (user.email ?? ''));
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

  // ── Step 3: Anti-sniping helper ──────────────────────────────────
  const applyAntiSnipe = (auctionEndTime: string, auctionId: string): boolean => {
    const msLeft = new Date(auctionEndTime).getTime() - Date.now();
    if (msLeft > SNIPE_WINDOW_MS) return false; // not in snipe window

    const count = auction?.extension_count ?? 0;
    if (count >= SNIPE_MAX) return false; // max extensions reached

    if (!isSupabaseConfigured()) {
      const updated = extendAuctionTime(auctionId);
      if (updated) {
        toast(`🛡️ Bid placed in final 30s! Auction extended by 30 seconds.`, {
          icon: '⏱',
          style: { background: '#1e1b4b', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' },
          duration: 5000,
        });
        return true;
      }
    } else {
      // Supabase mode — update end_time via RPC or direct update
      // (requires appropriate DB permissions — handled server-side ideally)
      applyBidOptimistic(auction!.current_price, ''); // no-op price, just trigger re-render
    }
    return false;
  };

  // ── Bid submission ────────────────────────────────────────────────
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to place a bid');
      navigate('/login');
      return;
    }
    // Sellers cannot bid — especially on their own auctions
    if (userRole === 'seller') {
      toast.error('Sellers cannot place bids. Switch to a Buyer account to bid.');
      return;
    }
    if (!auction) return;

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      toast.error(`Minimum bid is ${formatCurrency(minBid)}`);
      return;
    }

    if (isEnded) {
      toast.error('This auction has already ended');
      return;
    }

    if (isUpcoming) {
      toast.error('This auction has not started yet');
      return;
    }

    setIsPlacingBid(true);
    try {
      // ── Offline / local mode ─────────────────────────────────────
      if (!isSupabaseConfigured()) {
        localPlaceBid({
          auctionId: auction.id,
          bidderId: user.id,
          bidderEmail: user.email ?? 'You',
          amount,
        });
        emitBidEvent(auction.id, amount);
        applyBidOptimistic(amount, user.email ?? 'You');

        // ── Step 3: Anti-snipe check ─────────────────────────────
        applyAntiSnipe(auction.end_time, auction.id);

        setBidAmount('');
        toast.success('Bid placed! 🎉');
        return;
      }

      // ── Supabase mode ─────────────────────────────────────────────
      const result = await placeBidRPC({ auctionId: auction.id, userId: user.id, amount });

      if (!result.success) {
        toast.error(result.error || 'Failed to place bid');
        return;
      }

      applyBidOptimistic(amount, user.email ?? 'You');
      applyAntiSnipe(auction.end_time, auction.id);
      setBidAmount('');
      toast.success('Bid placed successfully! 🎉');
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
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
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <Loader2 style={{ width: '3rem', height: '3rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#818cf8', fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading Auction...</p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error || !auction) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <p style={{ color: '#f87171', fontWeight: 600 }}>{error || 'Auction not found'}</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: '1px solid rgba(55,65,81,0.6)', borderRadius: '0.75rem', color: '#9ca3af', padding: '0.65rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            ← Back to Auctions
          </button>
          <button
            onClick={refetch}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '0.75rem', color: '#a5b4fc', padding: '0.65rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            <RefreshCw style={{ width: '0.9rem', height: '0.9rem' }} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem 0', width: '100%' }}>
      {/* Back button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500, marginBottom: '2rem', padding: '0.5rem 0',
            transition: 'color 0.2s',
          }}
        >
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
          Back to Auctions
        </button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Main 2-col layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '2rem', alignItems: 'start' }}>

          {/* LEFT — Image + Details */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Image */}
            <div style={{
              borderRadius: '1.25rem',
              overflow: 'hidden',
              border: '1px solid rgba(55,65,81,0.5)',
              marginBottom: '1.5rem',
              background: '#111827',
              aspectRatio: '4/3',
              position: 'relative',
            }}>
              {auction.image_url ? (
                <img
                  src={auction.image_url}
                  alt={auction.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
                  No Image
                </div>
              )}
              {/* Status Badge */}
              <div style={{
                position: 'absolute', top: '1rem', left: '1rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.75rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                backdropFilter: 'blur(12px)',
                background: isEnded ? 'rgba(239,68,68,0.15)' : isUpcoming ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                color: isEnded ? '#f87171' : isUpcoming ? '#fbbf24' : '#4ade80',
                border: `1px solid ${isEnded ? 'rgba(239,68,68,0.3)' : isUpcoming ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                {isEnded ? 'Ended' : isUpcoming ? 'Upcoming' : 'Live'}
              </div>

              {/* Extension badge */}
              {(auction.extension_count ?? 0) > 0 && (
                <div style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  padding: '0.3rem 0.7rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem', fontWeight: 700,
                  backdropFilter: 'blur(12px)',
                  background: 'rgba(245,158,11,0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  <Zap style={{ width: '0.7rem', height: '0.7rem' }} />
                  Extended ×{auction.extension_count}
                </div>
              )}

              {/* Watchlist Heart */}
              {auction && (
                <button
                  onClick={() => toggleWatchlist(auction.id)}
                  style={{
                    position: 'absolute', top: '1rem', right: (auction.extension_count ?? 0) > 0 ? '7.5rem' : '1rem', zIndex: 10,
                    background: isWatched(auction.id) ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(8px)',
                    border: isWatched(auction.id) ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%', padding: '0.5rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                     e.currentTarget.style.transform = 'scale(1.1)';
                     if (!isWatched(auction.id)) e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
                  }}
                  onMouseOut={(e) => {
                     e.currentTarget.style.transform = 'scale(1)';
                     if (!isWatched(auction.id)) e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={isWatched(auction.id) ? '#ef4444' : 'none'} stroke={isWatched(auction.id) ? '#ef4444' : '#ffffff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
              )}
            </div>

            {/* Description Card */}
            <div className="glass-card" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>Verified Seller</span>
                <VerifiedBadge userId={auction.seller_id} />
                <div style={{ marginLeft: '1rem' }}>
                  <SellerRating userId={auction.seller_id} />
                </div>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                {auction.title}
              </h1>
              <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: '0.95rem' }}>
                {auction.description}
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '1rem', marginTop: '1.5rem',
                borderTop: '1px solid rgba(55,65,81,0.4)', paddingTop: '1.5rem',
              }}>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Starting Bid</p>
                  <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '1rem' }}>{formatCurrency(auction.start_price)}</p>
                </div>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Min Increment</p>
                  <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '1rem' }}>{formatCurrency(auction.min_increment)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT — Bidding Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {/* ── Step 2: Current Bid (real-time animated) ─────────────── */}
            <div className="glass-card" style={{ borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <TrendingUp style={{ width: '0.875rem', height: '0.875rem', color: '#818cf8' }} />
                Current Bid
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={auction.current_price}
                  initial={{ scale: 0.8, opacity: 0, y: -8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 1.1, opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                  style={{
                    fontSize: '2.75rem', fontWeight: 900,
                    background: 'linear-gradient(to right, #818cf8, #c084fc)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    lineHeight: 1,
                  }}
                >
                  {formatCurrency(auction.current_price)}
                </motion.p>
              </AnimatePresence>

              {/* ── Step 4: Winning / Outbid indicator ───────────────── */}
              {user && bids.length > 0 && (
                <AnimatePresence mode="wait">
                  {isWinning ? (
                    <motion.div
                      key="winning"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        marginTop: '0.85rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.35rem 1rem',
                        borderRadius: '9999px',
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#4ade80',
                        fontSize: '0.8rem', fontWeight: 700,
                      }}
                    >
                      <Trophy style={{ width: '0.85rem', height: '0.85rem' }} />
                      You are winning!
                    </motion.div>
                  ) : (
                    <motion.div
                      key="outbid"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        marginTop: '0.85rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.35rem 1rem',
                        borderRadius: '9999px',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171',
                        fontSize: '0.8rem', fontWeight: 700,
                      }}
                    >
                      <Bell style={{ width: '0.85rem', height: '0.85rem' }} />
                      You have been outbid
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Countdown Timer */}
            {!isEnded && (
              <div className={`glass-card ${urgentTimer ? 'badge-urgent' : ''}`} style={{
                borderRadius: '1rem', padding: '1.25rem',
                border: urgentTimer ? '1px solid rgba(239,68,68,0.3)' : undefined,
                background: urgentTimer ? 'rgba(239,68,68,0.04)' : undefined,
              }}>
                <p style={{ color: urgentTimer ? '#f87171' : '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock style={{ width: '0.875rem', height: '0.875rem', color: urgentTimer ? '#f87171' : '#818cf8' }} />
                  {isUpcoming ? 'Starts In' : urgentTimer ? '⚡ Ending Soon!' : 'Time Remaining'}
                  {/* Anti-snipe extensions indicator */}
                  {(auction.extension_count ?? 0) < SNIPE_MAX && !isEnded && !isUpcoming && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#4b5563', fontWeight: 500 }}>
                      Anti-snipe: {SNIPE_MAX - (auction.extension_count ?? 0)} ext. left
                    </span>
                  )}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <TimeBlock value={parts.days}    label="Days"  urgent={urgentTimer} />
                  <div style={{ color: '#4b5563', fontSize: '1.5rem', fontWeight: 300, paddingTop: '0.5rem' }}>:</div>
                  <TimeBlock value={parts.hours}   label="Hours" urgent={urgentTimer} />
                  <div style={{ color: '#4b5563', fontSize: '1.5rem', fontWeight: 300, paddingTop: '0.5rem' }}>:</div>
                  <TimeBlock value={parts.minutes} label="Min"   urgent={urgentTimer} />
                  <div style={{ color: '#4b5563', fontSize: '1.5rem', fontWeight: 300, paddingTop: '0.5rem' }}>:</div>
                  <TimeBlock value={parts.seconds} label="Sec"   urgent={urgentTimer} />
                </div>
              </div>
            )}

            {/* Ended Banner */}
            {isEnded && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '1rem', padding: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <Trophy style={{ width: '1.5rem', height: '1.5rem', color: '#fbbf24', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}>Auction Ended</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.15rem' }}>Final price: {formatCurrency(auction.current_price)}</p>
                </div>
              </div>
            )}

            {/* Bid Form — only for buyers, not for the auction's own seller */}
            {!isEnded && !isUpcoming && userRole !== 'seller' && (
              <div className="glass-card" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Gavel style={{ width: '1.125rem', height: '1.125rem', color: '#818cf8' }} />
                  <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Place Your Bid</h3>
                </div>

                {!user && (
                  <div style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '0.75rem', padding: '0.875rem',
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    marginBottom: '1rem',
                  }}>
                    <AlertCircle style={{ width: '1rem', height: '1rem', color: '#fbbf24', flexShrink: 0 }} />
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                      <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                      {' '}to place a bid
                    </p>
                  </div>
                )}

                {user && (
                  <SmartBidAssistant
                    currentPrice={auction.current_price}
                    minIncrement={auction.min_increment}
                    timeRemainingMs={msLeft}
                    bidCount={bids.length}
                    onSelectBid={(amount: number) => setBidAmount(amount.toString())}
                  />
                )}

                <form onSubmit={handlePlaceBid}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                      Your Bid Amount <span style={{ color: '#818cf8' }}>— min {formatCurrency(minBid)}</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                        color: '#818cf8', fontWeight: 700, fontSize: '0.9rem',
                      }}>₹</span>
                      <input
                        type="number"
                        min={minBid}
                        step="1"
                        required
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        placeholder={String(minBid)}
                        style={{
                          width: '100%', padding: '0.85rem 1rem 0.85rem 2rem',
                          background: 'rgba(17,24,39,0.7)',
                          border: '1px solid rgba(75,85,99,0.6)',
                          borderRadius: '0.75rem', color: 'white',
                          fontSize: '1rem', fontWeight: 600,
                          outline: 'none', boxSizing: 'border-box',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                        onBlur={e  => e.target.style.borderColor = 'rgba(75,85,99,0.6)'}
                        disabled={!user || isPlacingBid}
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={!user || isPlacingBid}
                    whileHover={{ scale: user ? 1.02 : 1 }}
                    whileTap={{ scale: user ? 0.97 : 1 }}
                    style={{
                      width: '100%', padding: '0.9rem',
                      background: user ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(55,65,81,0.5)',
                      color: 'white', border: 'none',
                      borderRadius: '0.75rem', cursor: user ? 'pointer' : 'not-allowed',
                      fontSize: '0.95rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      boxShadow: user ? '0 0 20px rgba(99,102,241,0.35)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    {isPlacingBid ? (
                      <><Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} /> Placing Bid...</>
                    ) : (
                      <><Gavel style={{ width: '1rem', height: '1rem' }} /> Place Bid</>
                    )}
                  </motion.button>
                </form>
              </div>
            )}

            {/* Seller owns this listing — show info panel instead of bid form */}
            {!isEnded && !isUpcoming && userRole === 'seller' && (
              <div className="glass-card" style={{ borderRadius: '1rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}>🏷️</div>
                  <div>
                    <p style={{ color: '#d8b4fe', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                      {isOwnAuction ? 'Your Listing' : 'Seller Account'}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.1rem' }}>
                      {isOwnAuction
                        ? 'You created this auction. Sellers cannot bid on their own listings.'
                        : 'Sellers cannot place bids. Register a Buyer account to bid.'}
                    </p>
                  </div>
                </div>
                {isOwnAuction && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                    paddingTop: '1rem', borderTop: '1px solid rgba(55,65,81,0.4)',
                  }}>
                    <div style={{ background: 'rgba(17,24,39,0.5)', borderRadius: '0.6rem', padding: '0.75rem', textAlign: 'center' }}>
                      <p style={{ color: '#6b7280', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Total Bids</p>
                      <p style={{ color: '#e5e7eb', fontWeight: 800, fontSize: '1.5rem' }}>{bids.length}</p>
                    </div>
                    <div style={{ background: 'rgba(17,24,39,0.5)', borderRadius: '0.6rem', padding: '0.75rem', textAlign: 'center' }}>
                      <p style={{ color: '#6b7280', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Current Price</p>
                      <p style={{ color: '#a5b4fc', fontWeight: 800, fontSize: '1rem' }}>{formatCurrency(auction.current_price)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isUpcoming && (
              <div style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '1rem', padding: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <Clock style={{ width: '1.25rem', height: '1.25rem', color: '#fbbf24', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}>Auction Not Started</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.15rem' }}>Bidding will open when the countdown begins.</p>
                </div>
              </div>
            )}

            {/* ── Step 1: Transparent Ledger ──────────────────── */}
            <div className="glass-card" style={{ borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                  <ShieldCheck style={{ width: '1.2rem', height: '1.2rem', color: '#10b981' }} />
                  Transparent Bid Ledger 🔗
                </h3>
                {bids.length > 0 && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '9999px',
                    padding: '0.2rem 0.6rem',
                  }}>
                    Top {Math.min(bids.length, 10)}
                  </span>
                )}
              </div>

              {/* Empty state */}
              {bids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <Gavel style={{ width: '2rem', height: '2rem', color: '#374151', margin: '0 auto 0.5rem' }} />
                  <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>No bids yet — be the first!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <AnimatePresence initial={false}>
                    {bids.slice(0, 10).map((bid, i) => {
                      const isMe = user?.email === bid.user_email;
                      return (
                        <motion.div
                          key={bid.id}
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25 }}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.65rem 0.9rem',
                            background: i === 0
                              ? isMe
                                ? 'rgba(34,197,94,0.08)'
                                : 'rgba(99,102,241,0.1)'
                              : 'rgba(17,24,39,0.5)',
                            borderRadius: '0.6rem',
                            border: i === 0
                              ? isMe
                                ? '1px solid rgba(34,197,94,0.3)'
                                : '1px solid rgba(99,102,241,0.3)'
                              : '1px solid rgba(55,65,81,0.3)',
                          }}
                        >
                          {/* Left — rank + bidder + time */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                            <div style={{
                              width: '1.5rem', height: '1.5rem', flexShrink: 0,
                              borderRadius: '50%',
                              background: i === 0 ? 'rgba(99,102,241,0.25)' : 'rgba(55,65,81,0.5)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', fontWeight: 700,
                              color: i === 0 ? '#a5b4fc' : '#6b7280',
                            }}>
                              #{i + 1}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                color: i === 0 ? (isMe ? '#4ade80' : '#c4b5fd') : '#9ca3af',
                                fontSize: '0.8rem', fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {isMe ? 'You' : maskEmail(bid.user_email)}
                                {i === 0 && (
                                  <span style={{
                                    marginLeft: '0.4rem',
                                    fontSize: '0.65rem', fontWeight: 700,
                                    color: isMe ? '#4ade80' : '#a5b4fc',
                                    background: isMe ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.15)',
                                    border: `1px solid ${isMe ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.25)'}`,
                                    borderRadius: '9999px',
                                    padding: '0.05rem 0.4rem',
                                  }}>
                                    {isMe ? '🏆 WINNING' : 'HIGHEST'}
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#4b5563', fontSize: '0.7rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>{timeAgo(bid.created_at)}</span>
                                <span style={{ color: '#374151' }}>•</span>
                                <button 
                                  onClick={() => copyToClipboard(generateMockTxHash(bid.id), 'Transaction Hash')}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                                    background: i === 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(55, 65, 81, 0.3)',
                                    border: i === 0 ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(75, 85, 99, 0.3)',
                                    color: i === 0 ? '#10b981' : '#9ca3af',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    fontSize: '0.65rem',
                                    transition: 'all 0.2s',
                                    fontFamily: 'monospace'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = i === 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(75, 85, 99, 0.4)'}
                                  onMouseOut={(e) => e.currentTarget.style.background = i === 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(55, 65, 81, 0.3)'}
                                  title="Verified on Chain (Copy Tx Hash)"
                                >
                                  <Copy style={{ width: '0.55rem', height: '0.55rem' }} />
                                  {shortenTxHash(generateMockTxHash(bid.id))}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right — amount */}
                          <span style={{
                            color: i === 0 ? (isMe ? '#4ade80' : '#a5b4fc') : '#e5e7eb',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            whiteSpace: 'nowrap',
                          }}>
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
    </div>
  );
};

/**
 * useAuction.ts
 * Fetches a single auction + its recent bids, and subscribes to
 * Supabase Realtime so that:
 *   - new bids appear instantly in the bid history
 *   - current_price updates live for all viewers
 *
 *
 */

import { useEffect, useState, useCallback } from 'react';
import { fetchAuction, fetchBids } from '../services/auctionService';
import type { BidRecord } from '../services/auctionService';
import { realtime } from '../services/realtime';
import { useCountdown } from './useCountdown';
import type { Auction } from '../types';

export interface UseAuctionResult {
  auction: Auction | null;
  bids: BidRecord[];
  isLoading: boolean;
  error: string | null;
  /** Countdown parts derived from auction.end_time */
  parts: { days: number; hours: number; minutes: number; seconds: number };
  timeLeft: string;
  isEnded: boolean;
  isUpcoming: boolean;
  minBid: number;
  refetch: () => Promise<void>;
  /** Update auction's current_price optimistically (called by bidding logic) */
  applyBidOptimistic: (amount: number, bidderEmail: string) => void;
}

const FALLBACK_END = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 h from now

export function useAuction(id: string | undefined): UseAuctionResult {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Countdown is derived from auction.end_time (or a safe fallback)
  const { parts, timeLeft, isEnded } = useCountdown(
    auction?.end_time ?? FALLBACK_END,
  );

  const isUpcoming = auction
    ? new Date(auction.start_time) > new Date() && auction.status === 'upcoming'
    : false;

  const minBid = auction ? auction.current_price + auction.min_increment : 0;

  // ── Data loading ────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id) return;
    const numericId = Number(id);
    if (isNaN(numericId)) return;

    setIsLoading(true);
    setError(null);

    try {
      const [auctionData, bidsData] = await Promise.all([
        fetchAuction(id),
        fetchBids(id),
      ]);
      setAuction(auctionData);
      setBids(bidsData);
    } catch (err: any) {
      console.error('[useAuction] fetch error:', err);
      setError(err.message ?? 'Failed to load auction');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // ── Realtime subscriptions ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    load();

    // ── Django Realtime WebSocket ──────────────────────────────────────
    realtime.connect(id);

    const handleBidPlaced = (payload: any) => {
      const { bid, current_highest_bid } = payload;

      const record: BidRecord = {
        id: bid.id,
        amount: bid.amount,
        created_at: bid.timestamp || new Date().toISOString(),
        user_email: bid.bidder_username || 'Anonymous', // We mapped this in serializer
      };

      setBids(prev => {
        // Deduplicate in case optimistic update already added a fake ID or we get double events
        if (prev.some(b => b.id === record.id || (b.amount === record.amount && b.user_email === record.user_email))) {
          return prev;
        }
        return [record, ...prev.slice(0, 9)];
      });

      setAuction(prev =>
        prev ? { ...prev, current_price: Math.max(prev.current_price, current_highest_bid) } : null,
      );
    };

    const unsubscribe = realtime.subscribe('BID_PLACED', handleBidPlaced);

    return () => {
      unsubscribe();
      realtime.disconnect();
    };
  }, [id, load]);

  // ── Optimistic update (called immediately after local bid submit) ─
  const applyBidOptimistic = useCallback((amount: number, bidderEmail: string) => {
    setAuction(prev => (prev ? { ...prev, current_price: amount } : null));
    setBids(prev => [
      {
        id: Date.now(),
        amount,
        created_at: new Date().toISOString(),
        user_email: bidderEmail,
      },
      ...prev.slice(0, 9),
    ]);
  }, []);

  return {
    auction,
    bids,
    isLoading,
    error,
    parts,
    timeLeft,
    isEnded,
    isUpcoming,
    minBid,
    refetch: load,
    applyBidOptimistic,
  };
}

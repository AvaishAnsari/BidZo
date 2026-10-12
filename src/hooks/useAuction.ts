/**
 * useAuction.ts
 * Fetches a single auction + its recent bids, and subscribes to
 * Django Channels so that:
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
  applyBidOptimistic: (amount: number, bidderName: string, bidderId: number) => void;
}

const FALLBACK_END = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 h from now

export function useAuction(id: string | undefined): UseAuctionResult {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Countdown is derived from auction.end_time (or a safe fallback)
  const { parts, timeLeft, isEnded: countdownEnded } = useCountdown(
    auction?.end_time ?? FALLBACK_END,
  );

  const isEnded = countdownEnded || (auction?.status === 'ended');

  const isUpcoming = auction
    ? !isEnded && (new Date(auction.start_time).getTime() > Date.now() || auction.status === 'upcoming')
    : false;

  const minBid = auction ? auction.current_price + 0.01 : 0;

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
        bidder_id: Number(bid.bidder),
        bidder_name: bid.bidder_name || bid.bidder_username || 'Anonymous',
        user_email: bid.bidder_name || bid.bidder_username || 'Anonymous',
      };

      setBids(prev => {
        // Deduplicate in case optimistic update already added a fake ID or we get double events
        if (prev.some(b => b.id === record.id || (b.amount === record.amount && b.bidder_id === record.bidder_id))) {
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
  const applyBidOptimistic = useCallback((amount: number, bidderName: string, bidderId: number) => {
    setAuction(prev => (prev ? { ...prev, current_price: amount } : null));
    setBids(prev => [
      {
        id: Date.now(),
        amount,
        created_at: new Date().toISOString(),
        bidder_id: bidderId,
        bidder_name: bidderName,
        user_email: bidderName,
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

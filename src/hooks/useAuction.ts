/**
 * useAuction.ts
 * Fetches a single auction + its recent bids, and subscribes to
 * Supabase Realtime so that:
 *   - new bids appear instantly in the bid history
 *   - current_price updates live for all viewers
 *
 * Falls back to localStore when Supabase is not configured.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { fetchAuction, fetchBids } from '../services/auctionService';
import type { BidRecord } from '../services/auctionService';
import { initLocalStore, getAuction, getBidsForAuction } from '../utils/localStore';
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
  const channelRef = useRef<RealtimeChannel | null>(null);

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
    setIsLoading(true);
    setError(null);

    // Offline / local mode
    if (!isSupabaseConfigured()) {
      initLocalStore();
      const localAuction = getAuction(id);
      if (localAuction) {
        setAuction(localAuction);
        const localBids = getBidsForAuction(localAuction.id);
        setBids(
          localBids.map(b => ({
            id: b.id,
            amount: b.amount,
            created_at: b.placedAt,
            user_email: b.bidderEmail,
          })),
        );
      } else {
        setError('Auction not found');
      }
      setIsLoading(false);
      return;
    }

    // Supabase mode
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

    if (!isSupabaseConfigured()) {
      // Local event bridge — bid amount updates
      const handleBid = (e: Event) => {
        const { auctionId, amount } = (e as CustomEvent).detail;
        if (auctionId === id) {
          setAuction(prev => (prev ? { ...prev, current_price: amount } : null));
        }
      };
      // Local event bridge — anti-snipe time extensions
      const handleExtend = (e: Event) => {
        const { auctionId, newEndTime } = (e as CustomEvent).detail;
        if (auctionId === id) {
          setAuction(prev =>
            prev ? { ...prev, end_time: newEndTime, extension_count: (prev.extension_count ?? 0) + 1 } : null,
          );
        }
      };
      window.addEventListener('bidzo:bid', handleBid);
      window.addEventListener('bidzo:extend', handleExtend);
      return () => {
        window.removeEventListener('bidzo:bid', handleBid);
        window.removeEventListener('bidzo:extend', handleExtend);
      };
    }

    // Subscribe to changes on the specific auction row
    const channel = supabase
      .channel(`auction:${id}`)
      // If any field on this auction changes (e.g. current_price after a bid)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${id}` },
        (payload) => {
          setAuction(prev => (prev ? { ...prev, ...(payload.new as Auction) } : null));
        },
      )
      // New bids on this auction
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${id}` },
        async (payload) => {
          const newBidRow = payload.new as { id: string; amount: number; created_at: string; user_id: string };
          // Fetch the bidder email
          let userEmail = 'Anonymous';
          try {
            const { data } = await supabase
              .from('users')
              .select('email')
              .eq('id', newBidRow.user_id)
              .single();
            if (data) userEmail = data.email;
          } catch {
            // ignore — email is cosmetic
          }

          const record: BidRecord = {
            id: newBidRow.id,
            amount: newBidRow.amount,
            created_at: newBidRow.created_at,
            user_email: userEmail,
          };

          setBids(prev => [record, ...prev.slice(0, 9)]);
          // Also patch auction's current_price so other tab sees it without waiting for UPDATE event
          setAuction(prev =>
            prev ? { ...prev, current_price: Math.max(prev.current_price, newBidRow.amount) } : null,
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [id, load]);

  // ── Optimistic update (called immediately after local bid submit) ─
  const applyBidOptimistic = useCallback((amount: number, bidderEmail: string) => {
    setAuction(prev => (prev ? { ...prev, current_price: amount } : null));
    setBids(prev => [
      {
        id: `optimistic-${Date.now()}`,
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

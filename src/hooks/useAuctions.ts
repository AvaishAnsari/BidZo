/**
 * useAuctions.ts
 * Fetches all auctions and subscribes to Supabase Realtime so that
 * any change to the `auctions` table (e.g. a new current_price after a bid)
 * is reflected instantly across all connected clients — no page refresh needed.
 *
 *
 */

import { useEffect, useState } from 'react';
import { fetchAuctions } from '../services/auctionService';
import { realtime } from '../services/realtime';
import type { Auction } from '../types';

export interface UseAuctionsResult {
  auctions: Auction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAuctions(): UseAuctionsResult {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAuctions();
      setAuctions(data);
    } catch (err: any) {
      console.error('[useAuctions] fetch error:', err);
      setError(err.message || 'Failed to load auctions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();

    // ── Realtime subscription ─────────────────────────────────────
    // ── Django Realtime WebSocket ──────────────────────────────────────
    realtime.connect(); // No specific ID connects to 'auction_global'

    const handleBidPlaced = (payload: any) => {
      const { auction_id, current_highest_bid } = payload;
      setAuctions(prev =>
        prev.map(a => (a.id === auction_id ? { ...a, current_price: current_highest_bid } : a)),
      );
    };

    const handleAuctionCreated = (payload: any) => {
      const { auction } = payload;
      const newAuction: Auction = {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        image_url: auction.image_url || '',
        start_price: Number(auction.starting_price),
        current_price: Number(auction.current_highest_bid),
        end_time: auction.end_time,
        start_time: auction.created_at, // Use created_at as fallback for start_time
        min_increment: 0, // Fallback for min_increment
        status: auction.status === 'active' ? 'live' : auction.status,
        created_at: auction.created_at,
        seller_id: auction.seller?.id || '',
      };
      setAuctions(prev => [newAuction, ...prev]);
    };

    const unsubBid = realtime.subscribe('BID_PLACED', handleBidPlaced);
    const unsubAuction = realtime.subscribe('AUCTION_CREATED', handleAuctionCreated);

    return () => {
      unsubBid();
      unsubAuction();
      realtime.disconnect();
    };
   
  }, []);

  return { auctions, isLoading, error, refetch: load };
}

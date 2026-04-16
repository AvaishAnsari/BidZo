/**
 * useAuctions.ts
 * Fetches all auctions and subscribes to Supabase Realtime so that
 * any change to the `auctions` table (e.g. a new current_price after a bid)
 * is reflected instantly across all connected clients — no page refresh needed.
 *
 * Falls back to the localStore when Supabase is not configured.
 */

import { useEffect, useState, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { fetchAuctions } from '../services/auctionService';
import { initLocalStore, loadAuctions } from '../utils/localStore';
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
  const channelRef = useRef<RealtimeChannel | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    // ── Offline / local mode ──────────────────────────────────────
    if (!isSupabaseConfigured()) {
      initLocalStore();
      setAuctions(loadAuctions());
      setIsLoading(false);
      return;
    }

    // ── Supabase mode ─────────────────────────────────────────────
    try {
      const data = await fetchAuctions();
      // If Supabase returned an empty table, seed with local dummy data
      setAuctions(data.length > 0 ? data : loadAuctions());
    } catch (err: any) {
      console.error('[useAuctions] fetch error:', err);
      setError(err.message ?? 'Failed to load auctions');
      // Fallback to local store so the UI never breaks
      initLocalStore();
      setAuctions(loadAuctions());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();

    // ── Realtime subscription ─────────────────────────────────────
    if (!isSupabaseConfigured()) {
      // In offline mode, listen for custom bid events from localStore
      const handleBid = (e: Event) => {
        const { auctionId, amount } = (e as CustomEvent).detail;
        setAuctions(prev =>
          prev.map(a => (a.id === auctionId ? { ...a, current_price: amount } : a)),
        );
      };
      window.addEventListener('bidzo:bid', handleBid);
      return () => window.removeEventListener('bidzo:bid', handleBid);
    }

    // Subscribe to any UPDATE on the auctions table so current_price
    // propagates in real-time to every open browser tab/window.
    const channel = supabase
      .channel('public:auctions')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions' },
        (payload) => {
          const updated = payload.new as Auction;
          setAuctions(prev =>
            prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a)),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auctions' },
        (payload) => {
          const newAuction = payload.new as Auction;
          setAuctions(prev => [newAuction, ...prev]);
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useAuctions] Realtime channel error — falling back to polling');
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
   
  }, []);

  return { auctions, isLoading, error, refetch: load };
}

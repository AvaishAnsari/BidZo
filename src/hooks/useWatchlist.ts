/**
 * useWatchlist.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated hook for managing user watchlists with the Django REST backend.
 * Uses local persistence per authenticated user and cross-component sync.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem(`watchlist_${user.id}`);
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading watchlist history:', e);
      }
    } else {
      setWatchlist([]);
    }
    setLoading(false);
  }, [user]);

  // Sync mechanism across components/tabs
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<number[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setWatchlist(customEvent.detail);
      }
    };
    window.addEventListener('watchlistUpdated', handleSync);
    return () => window.removeEventListener('watchlistUpdated', handleSync);
  }, []);

  const toggleWatchlist = useCallback(
    async (auctionId: number | string) => {
      if (!user) {
        toast.error('Please log in to manage your watchlist.');
        return;
      }

      const id = typeof auctionId === 'string' ? parseInt(auctionId, 10) : auctionId;
      if (isNaN(id)) return;

      setWatchlist((prev) => {
        const exists = prev.includes(id);
        const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];

        try {
          localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to persist watchlist:', e);
        }

        window.dispatchEvent(new CustomEvent('watchlistUpdated', { detail: updated }));

        if (exists) {
          toast.success('Removed from watchlist');
        } else {
          toast.success('Added to watchlist!', { icon: '❤️' });
        }

        return updated;
      });
    },
    [user]
  );

  const inWatchlist = useCallback(
    (auctionId: number | string): boolean => {
      const id = typeof auctionId === 'string' ? parseInt(auctionId, 10) : auctionId;
      return watchlist.includes(id);
    },
    [watchlist]
  );

  const isWatched = inWatchlist;

  return {
    watchlist,
    watchedIds: watchlist,
    loading,
    isLoading: loading,
    isLoaded: !loading,
    toggleWatchlist,
    inWatchlist,
    isWatched,
  };
}

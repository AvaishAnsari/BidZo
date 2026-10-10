import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getAuthHeaders, handleAuthError } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setWatchlist([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE_URL}/users/me/watchlist/`, { headers: getAuthHeaders() })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          if (handleAuthError(response, body)) return;
          throw new Error(body.detail || body.error || 'Could not load your watchlist.');
        }
        if (!cancelled) setWatchlist(Array.isArray(body.auction_ids) ? body.auction_ids.map(Number) : []);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message || 'Could not load your watchlist.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<number[]>).detail;
      if (Array.isArray(detail)) setWatchlist(detail);
    };
    window.addEventListener('watchlistUpdated', handleSync);
    return () => window.removeEventListener('watchlistUpdated', handleSync);
  }, []);

  const toggleWatchlist = useCallback(async (auctionId: number | string) => {
    if (!user) {
      toast.error('Please log in to manage your watchlist.');
      return;
    }
    const id = Number(auctionId);
    if (!Number.isInteger(id) || id <= 0) return;
    const exists = watchlist.includes(id);
    try {
      const response = await fetch(
        exists ? `${API_BASE_URL}/users/me/watchlist/${id}/` : `${API_BASE_URL}/users/me/watchlist/`,
        {
          method: exists ? 'DELETE' : 'POST',
          headers: getAuthHeaders(),
          ...(exists ? {} : { body: JSON.stringify({ auction_id: id }) }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        if (handleAuthError(response, body)) return;
        throw new Error(body.detail || body.error || 'Could not update your watchlist.');
      }
      const updated = exists ? watchlist.filter((item) => item !== id) : [...watchlist, id];
      setWatchlist(updated);
      window.dispatchEvent(new CustomEvent('watchlistUpdated', { detail: updated }));
      toast.success(exists ? 'Removed from watchlist' : 'Added to watchlist!', { icon: exists ? undefined : '❤️' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your watchlist.');
    }
  }, [user, watchlist]);

  const inWatchlist = useCallback((auctionId: number | string) => watchlist.includes(Number(auctionId)), [watchlist]);

  return {
    watchlist,
    watchedIds: watchlist,
    loading,
    isLoading: loading,
    isLoaded: !loading,
    toggleWatchlist,
    inWatchlist,
    isWatched: inWatchlist,
  };
}

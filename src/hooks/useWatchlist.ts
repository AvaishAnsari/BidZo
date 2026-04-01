import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import toast from 'react-hot-toast';

export function useWatchlist() {
  const { user } = useAuth();
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch initial watchlist from DB
  useEffect(() => {
    async function loadWatchlist() {
      if (!user) {
        setWatchedIds([]);
        setIsLoaded(true);
        return;
      }

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('watchlist')
            .select('auction_id')
            .eq('user_id', user.id);

          if (error) throw error;
          
          if (data) {
            setWatchedIds(data.map(item => item.auction_id));
          }
        } catch (error) {
          console.error("Failed to load watchlist from Supabase:", error);
        }
      }
      setIsLoaded(true);
    }

    loadWatchlist();
  }, [user]);

  // Sync mechanism across components
  useEffect(() => {
    const handleSync = (e: any) => {
      // Sync local state if a custom event was fired
      if (e.detail && Array.isArray(e.detail)) {
        setWatchedIds(e.detail);
      }
    };
    window.addEventListener('watchlistUpdated', handleSync);
    return () => window.removeEventListener('watchlistUpdated', handleSync);
  }, []);

  const syncAcrossTabs = (newIds: string[]) => {
    window.dispatchEvent(new CustomEvent('watchlistUpdated', { detail: newIds }));
  };

  const toggleWatchlist = async (auctionId: string) => {
    if (!user) {
      toast.error('Please log in to manage your watchlist');
      return;
    }

    const previouslyWatched = watchedIds.includes(auctionId);
    
    // 1. Optimistic UI update instantly!
    const updatedIds = previouslyWatched
      ? watchedIds.filter(id => id !== auctionId)
      : [...watchedIds, auctionId];
      
    setWatchedIds(updatedIds);
    syncAcrossTabs(updatedIds);

    // 2. Database Sync
    if (isSupabaseConfigured()) {
      try {
        if (previouslyWatched) {
          // Remove from DB
          const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', user.id)
            .eq('auction_id', auctionId);
            
          if (error) throw error;
        } else {
          // Add to DB
          const { error } = await supabase
            .from('watchlist')
            .insert({ user_id: user.id, auction_id: auctionId });
            
          if (error) throw error;
          toast.success('Added to Watchlist!', { icon: '❤️' });
        }
      } catch (error: any) {
        console.error("Watchlist sync error:", error);
        // Rollback state if DB request failed securely
        toast.error('Failed to sync watchlist. Reverting changes.');
        setWatchedIds(watchedIds); // Revert to old state
        syncAcrossTabs(watchedIds);
      }
    } else {
      // Offline fallback
      if (!previouslyWatched) toast.success('Added locally! ❤️');
    }
  };

  const isWatched = (auctionId: string): boolean => {
    return watchedIds.includes(auctionId);
  };

  return {
    watchedIds,
    toggleWatchlist,
    isWatched,
    isLoaded
  };
}

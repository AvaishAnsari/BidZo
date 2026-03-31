import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useWatchlist() {
  const { user } = useAuth();
  
  // Use a fallback key if anonymous, though typically tied to user.id
  const storageKey = `bidzo_watchlist_${user?.id || 'guest'}`;

  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setWatchedIds(JSON.parse(stored));
      } else {
        setWatchedIds([]);
      }
    } catch (e) {
      console.error('Failed to parse watchlist from storage', e);
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save to local storage whenever watchedIds change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(watchedIds));
      
      // Optional: dispatch a custom event to sync across tabs/components
      window.dispatchEvent(new Event('watchlistUpdated'));
    }
  }, [watchedIds, isLoaded, storageKey]);

  // Sync across tabs/components in same window
  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only update if different
          if (JSON.stringify(parsed) !== JSON.stringify(watchedIds)) {
            setWatchedIds(parsed);
          }
        }
      } catch (e) {
        // Safe fail
      }
    };
    window.addEventListener('watchlistUpdated', handleSync);
    window.addEventListener('storage', handleSync); // For true multi-tab
    return () => {
      window.removeEventListener('watchlistUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [storageKey, watchedIds]);

  const addToWatchlist = (auctionId: string) => {
    setWatchedIds(prev => {
      if (!prev.includes(auctionId)) {
        return [...prev, auctionId];
      }
      return prev;
    });
  };

  const removeFromWatchlist = (auctionId: string) => {
    setWatchedIds(prev => prev.filter(id => id !== auctionId));
  };

  const toggleWatchlist = (auctionId: string) => {
    setWatchedIds(prev => 
      prev.includes(auctionId) 
        ? prev.filter(id => id !== auctionId)
        : [...prev, auctionId]
    );
  };

  const isWatched = (auctionId: string): boolean => {
    return watchedIds.includes(auctionId);
  };

  return {
    watchedIds,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isWatched,
    isLoaded
  };
}

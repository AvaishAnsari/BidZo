/**
 * useWatchlist.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete local hook that provides all functions needed by the AuctionCard components.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const loading = false;

  useEffect(() => {
    if (!user) {
      setWatchlist([]);
      return;
    }
    const stored = localStorage.getItem(`watchlist_${user.id}`);
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading watchlist history:", e);
      }
    }
  }, [user]);

  const toggleWatchlist = async (auctionId: number) => {
    if (!user) {
      toast.error("Please log in to manage your watchlist.");
      return;
    }

    setWatchlist((prev) => {
      const updated = prev.includes(auctionId)
        ? prev.filter((id) => id !== auctionId)
        : [...prev, auctionId];
      
      localStorage.setItem(`watchlist_${user.id}`, JSON.stringify(updated));
      
      if (prev.includes(auctionId)) {
        toast.success("Removed from watchlist");
      } else {
        toast.success("Added to watchlist!");
      }
      
      return updated;
    });
  };

  // Provide both naming styles to satisfy different layout cards across the codebase
  const inWatchlist = (auctionId: number) => watchlist.includes(auctionId);
  const isWatched = (auctionId: number) => watchlist.includes(auctionId);

  return { watchlist, loading, toggleWatchlist, inWatchlist, isWatched };
}

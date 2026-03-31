/**
 * useCountdown.ts
 * Reusable countdown hook that ticks every second and derives
 * readable time parts from an ISO end-time string.
 */

import { useEffect, useState } from 'react';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface UseCountdownResult {
  parts: CountdownParts;
  timeLeft: string;
  isEnded: boolean;
  isUrgent: boolean;
}

const ZERO_PARTS: CountdownParts = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function computeCountdown(endTime: string): { parts: CountdownParts; timeLeft: string; isEnded: boolean; isUrgent: boolean } {
  const diff = new Date(endTime).getTime() - Date.now();

  if (diff <= 0) {
    return { parts: ZERO_PARTS, timeLeft: 'Ended', isEnded: true, isUrgent: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let timeLeft: string;
  if (days > 0) {
    timeLeft = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    timeLeft = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    timeLeft = `${minutes}m ${seconds}s`;
  }

  const isUrgent = diff <= 5 * 60 * 1000; // < 5 minutes

  return { parts: { days, hours, minutes, seconds }, timeLeft, isEnded: false, isUrgent };
}

export function useCountdown(endTime: string): UseCountdownResult {
  const [state, setState] = useState(() => computeCountdown(endTime));

  useEffect(() => {
    // Recompute immediately whenever endTime changes
    setState(computeCountdown(endTime));

    const id = setInterval(() => {
      const next = computeCountdown(endTime);
      setState(next);
      if (next.isEnded) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [endTime]);

  return state;
}

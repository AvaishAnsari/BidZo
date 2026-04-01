/**
 * useCountdown.ts
 * Reusable countdown hook that ticks every second and derives
 * readable time parts from an ISO end-time string.
 */

import { useEffect, useState } from 'react';
import { getValidatedNow } from '../utils/timeSync';

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
  const diff = new Date(endTime).getTime() - getValidatedNow();

  if (diff <= 0) {
    return { parts: ZERO_PARTS, timeLeft: '00:00:00', isEnded: true, isUrgent: false };
  }

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const hh = totalHours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');

  const timeLeft = `${hh}:${mm}:${ss}`;

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

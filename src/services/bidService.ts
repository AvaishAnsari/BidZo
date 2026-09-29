/**
 * bidService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated from Supabase to Django REST API for real-time bid operations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getAuthHeaders } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface PlaceBidParams {
  auctionId: string | number;
  userId?: string | number;
  amount: number;
}

export interface PlaceBidResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface PlaceBidInput {
  auctionId: string | number;
  amount: number;
  userId?: string | number;
}

/**
 * Places a live bid on an auction item via Django REST API.
 */
export async function placeBid({ auctionId, amount }: PlaceBidInput): Promise<void> {
  const result = await placeBidRPC(auctionId, amount);
  if (!result.success) {
    throw new Error(result.message || result.error || 'Failed to place bid');
  }
}

/**
 * Primary bid placement RPC function for Django REST API.
 * Supports both (auctionId, amount) signature and ({ auctionId, amount }) params.
 */
export async function placeBidRPC(
  auctionIdOrParams: number | string | PlaceBidParams,
  amountArg?: number
): Promise<PlaceBidResult> {
  let auctionId: number | string;
  let amount: number;

  if (typeof auctionIdOrParams === 'object') {
    auctionId = auctionIdOrParams.auctionId;
    amount = auctionIdOrParams.amount;
  } else {
    auctionId = auctionIdOrParams;
    amount = amountArg ?? 0;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount: amount }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const msg = 'Authentication failed. Please log in to place a bid.';
        return { success: false, error: msg, message: msg };
      }
      let errorMsg = `Failed to place bid: ${response.status}`;
      try {
        const data = await response.json();
        errorMsg = data.error || data.detail || errorMsg;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMsg = errorText;
      }
      return { success: false, error: errorMsg, message: errorMsg };
    }

    return { success: true, message: 'Bid placed successfully' };
  } catch (error: any) {
    console.error('[bidService] placeBidRPC error:', error.message);
    const msg = error.message || 'Unknown network error';
    return { success: false, error: msg, message: msg };
  }
}

// ── Fallback exports for backward compatibility ──────────────────────────────

export async function fetchBids(auctionId: string | number) {
  console.log('Fallback fetchBids called for:', auctionId);
  return [];
}

export async function subscribeToBids(auctionId: string | number, _callback: Function) {
  console.log('Fallback subscribeToBids active for:', auctionId);
  return { unsubscribe: () => {} };
}

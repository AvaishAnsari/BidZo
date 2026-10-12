/**
 * bidService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated from Supabase to Django REST API for real-time bid operations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getAuthHeaders, API_BASE_URL } from './api';

export interface PlaceBidParams {
  auctionId: string | number;
  userId?: string | number;
  amount: number;
  recaptchaToken?: string;
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
  recaptchaToken?: string;
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
    const body: any = { amount: amount };
    if (auctionIdOrParams && typeof auctionIdOrParams === 'object' && 'recaptchaToken' in auctionIdOrParams && auctionIdOrParams.recaptchaToken) {
      body.recaptcha_token = auctionIdOrParams.recaptchaToken;
    }

    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMsg = `Failed to place bid: ${response.status}`;
      try {
        const data = await response.json();
        errorMsg = data.error || data.detail || errorMsg;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMsg = errorText;
      }

      if (response.status === 401) {
        const msg = 'Your session has expired. Please log in again to place a bid.';
        return { success: false, error: msg, message: msg };
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

/**
 * bidService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated from Supabase to Django REST API for real-time bid operations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
import { getAuthHeaders } from './api';

export interface PlaceBidInput {
  auctionId: string;
  amount: number;
  userId: string;
}

/**
 * Places a live bid on an auction item.
 */
export async function placeBid({ auctionId, amount }: PlaceBidInput): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount: amount }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in to place a bid.');
      }
      const errorText = await response.text();
      throw new Error(errorText || `Failed to place bid: ${response.status}`);
    }
  } catch (error: any) {
    console.error('[bidService] placeBid error:', error.message);
    throw error;
  }
}

// ── Added Placeholders to prevent frontend router crashes ─────────────────────

export async function fetchBids(auctionId: string) {
  console.log('Fallback fetchBids called for:', auctionId);
  return [];
}

export async function subscribeToBids(auctionId: string, _callback: Function) {
  console.log('Fallback subscribeToBids active for:', auctionId);
  return { unsubscribe: () => {} };
}


/**
 * Exported function to satisfy the AuctionDetail view imports
 */
export async function placeBidRPC(auctionId: number, amount: number): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      // If we use JWT cookies or similar, credentials: 'include' might be needed
      credentials: 'omit',
      body: JSON.stringify({ amount: amount }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Authentication failed. Please log in to place a bid.' };
      }
      const errorText = await response.text();
      return { success: false, message: errorText || `Failed to place bid: ${response.status}` };
    }

    // In case the response is JSON, we could parse it, but we return success
    return { success: true, message: 'Bid processed successfully' };
  } catch (error: any) {
    console.error('[bidService] placeBidRPC error:', error.message);
    return { success: false, message: error.message };
  }
}

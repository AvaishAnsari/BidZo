/**
 * bidService.ts
 * All bid placement logic goes through here.
 *
 * Strategy:
 *  1. Try the server-side `place_bid()` RPC (validates live status,
 *     minimum increment, and seller-cannot-bid rules atomically).
 *  2. If the RPC is unavailable (e.g. not yet deployed), fall back to
 *     a direct insert + update — **still requires the user to be authenticated**.
 */

import { supabase } from '../utils/supabase';

export interface PlaceBidParams {
  auctionId: string;
  userId: string;
  amount: number;
}

export interface PlaceBidResult {
  success: boolean;
  error?: string;
}

/**
 * Place a bid via the `place_bid` Supabase RPC.
 *
 * The RPC (defined in supabase_schema.sql) performs all validation
 * atomically:
 *   - Auction must be 'live'
 *   - Auction must not be past its end_time
 *   - Amount must be >= current_price + min_increment
 *   - Caller must not be the seller
 *
 * On success, it inserts the bid AND updates current_price in one transaction.
 */
export async function placeBidRPC(params: PlaceBidParams): Promise<PlaceBidResult> {
  try {
    const { data, error } = await supabase.rpc('place_bid', {
      p_auction_id: params.auctionId,
      p_amount: params.amount,
    });

    if (error) {
      // RPC function might not exist yet — fall back to direct approach
      if (
        error.code === 'PGRST202' ||   // function not found
        error.code === '42883' ||       // undefined function
        error.message?.includes('Could not find the function')
      ) {
        return await placeBidDirect(params);
      }
      return { success: false, error: error.message };
    }

    // The RPC returns a JSONB with { success, error? }
    const result = data as { success: boolean; error?: string };
    return result;
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Unknown error' };
  }
}

/**
 * Fallback: place a bid with a direct insert + auction update.
 * This is less safe than the RPC (no atomicity) but works without
 * the function being deployed.
 */
async function placeBidDirect(params: PlaceBidParams): Promise<PlaceBidResult> {
  try {
    // Insert the bid
    const { error: bidError } = await supabase.from('bids').insert({
      auction_id: params.auctionId,
      user_id: params.userId,
      amount: params.amount,
    });

    if (bidError) return { success: false, error: bidError.message };

    // Update the auction's current price
    const { error: updateError } = await supabase
      .from('auctions')
      .update({ current_price: params.amount })
      .eq('id', params.auctionId);

    if (updateError) return { success: false, error: updateError.message };

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Unknown error' };
  }
}

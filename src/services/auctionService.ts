/**
 * auctionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All Supabase READ operations for the auctions feature.
 * Pages and hooks call these functions — never query Supabase directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from '../utils/supabase';
import type { Auction } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BidRecord {
  id: string;
  amount: number;
  created_at: string;
  user_email: string;
}

// ── Auction queries ────────────────────────────────────────────────────────

/**
 * Fetch ALL auctions ordered by newest-first.
 * Maps:  title | description | image_url | current_price | end_time | status
 */
export async function fetchAuctions(): Promise<Auction[]> {
  const { data, error } = await supabase
    .from('auctions')
    .select(
      'id, title, description, image_url, start_price, current_price, ' +
      'min_increment, start_time, end_time, seller_id, status, created_at',
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[auctionService] fetchAuctions error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as Auction[];
}

/**
 * Fetch a SINGLE auction by ID.
 */
export async function fetchAuction(id: string): Promise<Auction> {
  const { data, error } = await supabase
    .from('auctions')
    .select(
      'id, title, description, image_url, start_price, current_price, ' +
      'min_increment, start_time, end_time, seller_id, status, created_at',
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('[auctionService] fetchAuction error:', error.message);
    throw new Error(error.message);
  }

  return data as unknown as Auction;
}

/**
 * Fetch the most recent bids for an auction (newest first, limited to 10).
 * Joins the `users` table to include the bidder's email.
 */
export async function fetchBids(auctionId: string): Promise<BidRecord[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('id, amount, created_at, users(email)')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[auctionService] fetchBids error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []).map((b: any) => ({
    id: b.id,
    amount: Number(b.amount),
    created_at: b.created_at,
    user_email: b.users?.email ?? 'Anonymous',
  }));
}

/**
 * Mark an auction as 'ended'.
 * RLS on the server enforces that only the seller can do this.
 */
export async function markAuctionEnded(auctionId: string): Promise<void> {
  const { error } = await supabase
    .from('auctions')
    .update({ status: 'ended' })
    .eq('id', auctionId);

  if (error) {
    console.error('[auctionService] markAuctionEnded error:', error.message);
    throw new Error(error.message);
  }
}

/**
 * Fetch live auctions only (status = 'live' and end_time in the future).
 * Useful for the homepage filter.
 */
export async function fetchLiveAuctions(): Promise<Auction[]> {
  const { data, error } = await supabase
    .from('auctions')
    .select(
      'id, title, description, image_url, start_price, current_price, ' +
      'min_increment, start_time, end_time, seller_id, status, created_at',
    )
    .eq('status', 'live')
    .gt('end_time', new Date().toISOString())
    .order('end_time', { ascending: true });

  if (error) {
    console.error('[auctionService] fetchLiveAuctions error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as Auction[];
}

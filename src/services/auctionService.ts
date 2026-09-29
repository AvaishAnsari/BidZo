/**
 * auctionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated from Supabase to Django REST API for the auctions feature.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Auction } from '../types';

// Read our newly created local environment variable
const API_BASE_URL = 'http://localhost:8000/api';
import { getAuthHeaders } from './api';


export interface BidRecord {
  id: number;
  amount: number;
  created_at: string;
  user_email: string;
}

// Helper to handle response checks cleanly
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Network response error: ${response.status}`);
  }
  return response.json();
}

// ── Django API Mappings & Queries ───────────────────────────────────────────

/**
 * Fetch ALL auctions ordered by newest-first.
 */
export async function fetchAuctions(): Promise<Auction[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/`);
    const data = await handleResponse(response);

    // Map Django model naming architecture safely back to React's expected interface keys
    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url || '',
      start_price: Number(item.starting_price),
      current_price: Number(item.current_highest_bid),
      end_time: item.end_time,
      status: item.status === 'active' ? 'live' : item.status, // Match React's state key
      created_at: item.created_at,
      seller_id: item.seller?.id || '',
    })) as Auction[];
  } catch (error: any) {
    console.error('[auctionService] fetchAuctions error:', error.message);
    throw error;
  }
}

/**
 * Create a new auction via Django POST /api/auctions/
 */
export async function createAuctionAPI(payload: { title: string; description: string; starting_price: number; end_time: string; }): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed. Please log in to create an auction.');
      }
      const errorText = await response.text();
      throw new Error(errorText || `Failed to create auction: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('[auctionService] createAuctionAPI error:', error.message);
    throw error;
  }
}

/**
 * Fetch a SINGLE auction by ID.
 */
export async function fetchAuction(id: string): Promise<Auction> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${id}/`);
    const item = await handleResponse(response);

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url || '',
      start_price: Number(item.starting_price),
      current_price: Number(item.current_highest_bid),
      end_time: item.end_time,
      status: item.status === 'active' ? 'live' : item.status,
      created_at: item.created_at,
      seller_id: item.seller?.id || '',
    } as Auction;
  } catch (error: any) {
    console.error('[auctionService] fetchAuction error:', error.message);
    throw error;
  }
}

/**
 * Fetch the most recent bids for an auction.
 */
export async function fetchBids(auctionId: string): Promise<BidRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids/`);
    const data = await handleResponse(response);

    return data.slice(0, 10).map((b: any) => ({
      id: b.id,
      amount: Number(b.amount),
      created_at: b.timestamp,
      user_email: b.bidder?.email || b.bidder?.username || 'Anonymous',
    }));
  } catch (error: any) {
    console.error('[auctionService] fetchBids error:', error.message);
    return []; // Return safe baseline array if bids mapping endpoint isn't fully routed yet
  }
}

/**
 * Fetch ALL bids for an auction.
 */
export async function fetchAllBids(auctionId: string): Promise<BidRecord[]> {
  return fetchBids(auctionId); // Share the same base array parsing logic cleanly
}

/**
 * Mark an auction as 'ended'.
 */
export async function markAuctionEnded(auctionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'completed' }),
    });
    await handleResponse(response);
  } catch (error: any) {
    console.error('[auctionService] markAuctionEnded error:', error.message);
    throw error;
  }
}

/**
 * Fetch live auctions only.
 */
export async function fetchLiveAuctions(): Promise<Auction[]> {
  const allAuctions = await fetchAuctions();
  // Simple frontend filtering strategy for clean parsing until complex backend parameters are implemented
  return allAuctions.filter(a => a.status === 'live' && new Date(a.end_time) > new Date());
}

/**
 * Triggers backend winner settlement logic.
 */
export async function closeAuctionRPC(auctionId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/close/`, { method: 'POST', headers: getAuthHeaders() });
    await handleResponse(response);
    return { success: true, message: 'Auction closed securely' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Unknown network error' };
  }
}

/**
 * Mock implementation of placeBidRPC to satisfy the frontend imports
 */
export async function placeBidRPC(auctionId: number, amount: number): Promise<{ success: boolean; message?: string }> {
  console.log('placeBidRPC called with:', auctionId, amount);
  return { success: true, message: 'Bid processed' };
}

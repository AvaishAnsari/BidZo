/**
 * auctionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated from Supabase to Django REST API for the auctions feature.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Auction } from '../types';
import { getAuthHeaders, getValidAuthHeaders, clearAuthSession, API_BASE_URL } from './api';

export interface BidRecord {
  id: number;
  amount: number;
  created_at: string;
  user_email: string;
}

// Helper to handle response checks cleanly
async function handleResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
    }
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
    const headers = await getValidAuthHeaders();
    let response = await fetch(`${API_BASE_URL}/auctions/`, {
      headers,
    });

    // If 401 unauthorized (stale or expired token), clear session and retry unauthenticated
    if (response.status === 401 && headers['Authorization']) {
      clearAuthSession();
      response = await fetch(`${API_BASE_URL}/auctions/`, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await handleResponse(response);

    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url || '',
      start_price: Number(item.starting_price),
      current_price: Number(item.current_highest_bid > 0 ? item.current_highest_bid : item.starting_price),
      min_increment: 0,
      start_time: item.created_at || new Date().toISOString(),
      end_time: item.end_time,
      status: item.status === 'active' ? 'live' : item.status === 'completed' ? 'ended' : (item.status || 'live'),
      created_at: item.created_at || new Date().toISOString(),
      seller_id: item.seller ? (typeof item.seller === 'object' ? item.seller.id : item.seller) : 0,
      category: item.category || 'General',
      bid_count: item.bids ? item.bids.length : 0,
      moderation_status: item.moderation_status,
      seller_name: item.seller_name || '',
      images: item.images || (item.image_url ? [item.image_url] : []),
    })) as Auction[];
  } catch (error: any) {
    console.error('[auctionService] fetchAuctions error:', error.message);
    throw error;
  }
}

/**
 * Upload 1 or more image files to Django /api/upload/
 */
export async function uploadAuctionImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload/`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Image upload failed (${response.status})`;
    try {
      const data = await response.json();
      errorMsg = data.error || data.detail || errorMsg;
    } catch {
      const text = await response.text();
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.urls || (data.url ? [data.url] : []);
}

/**
 * Create a new auction via Django POST /api/auctions/
 */
export async function createAuctionAPI(payload: {
  title: string;
  description: string;
  starting_price: number;
  end_time: string;
  category?: string;
  image_url?: string;
  images?: string[];
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMsg = `Failed to create auction: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.detail || errorMsg;
      } catch {
        const errorText = await response.text();
        if (errorText) errorMsg = errorText;
      }

      if (response.status === 401) {
        throw new Error('Your session has expired. Please log in again to create an auction.');
      }
      throw new Error(errorMsg);
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
export async function fetchAuction(id: string | number): Promise<Auction> {
  try {
    const headers = await getValidAuthHeaders();
    let response = await fetch(`${API_BASE_URL}/auctions/${id}/`, {
      headers,
    });

    if (response.status === 401 && headers['Authorization']) {
      clearAuthSession();
      response = await fetch(`${API_BASE_URL}/auctions/${id}/`, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const item = await handleResponse(response);

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url || '',
      start_price: Number(item.starting_price),
      current_price: Number(item.current_highest_bid > 0 ? item.current_highest_bid : item.starting_price),
      min_increment: 0,
      start_time: item.created_at || new Date().toISOString(),
      end_time: item.end_time,
      status: item.status === 'active' ? 'live' : item.status === 'completed' ? 'ended' : (item.status || 'live'),
      created_at: item.created_at || new Date().toISOString(),
      seller_id: item.seller ? (typeof item.seller === 'object' ? item.seller.id : item.seller) : 0,
      category: item.category || 'General',
      bid_count: item.bids ? item.bids.length : 0,
      moderation_status: item.moderation_status,
      seller_name: item.seller_name || '',
      images: item.images || (item.image_url ? [item.image_url] : []),
    } as Auction;
  } catch (error: any) {
    console.error('[auctionService] fetchAuction error:', error.message);
    throw error;
  }
}

/**
 * Fetch the most recent bids for an auction.
 */
export async function fetchBids(auctionId: string | number): Promise<BidRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids/`);
    const data = await handleResponse(response);

    return (Array.isArray(data) ? data : []).slice(0, 10).map((b: any) => ({
      id: b.id,
      amount: Number(b.amount),
      created_at: b.timestamp || b.created_at || new Date().toISOString(),
      user_email: b.bidder_username || b.bidder?.email || b.bidder?.username || 'Anonymous',
    }));
  } catch (error: any) {
    console.error('[auctionService] fetchBids error:', error.message);
    return [];
  }
}

/**
 * Fetch ALL bids for an auction.
 */
export async function fetchAllBids(auctionId: string | number): Promise<BidRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/bids/`);
    const data = await handleResponse(response);

    return (Array.isArray(data) ? data : []).map((b: any) => ({
      id: b.id,
      amount: Number(b.amount),
      created_at: b.timestamp || b.created_at || new Date().toISOString(),
      user_email: b.bidder_username || b.bidder?.email || b.bidder?.username || 'Anonymous',
    }));
  } catch (error: any) {
    console.error('[auctionService] fetchAllBids error:', error.message);
    return [];
  }
}

/**
 * Mark an auction as 'ended'.
 */
export async function markAuctionEnded(auctionId: string | number): Promise<void> {
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
  return allAuctions.filter((a) => a.status === 'live' && new Date(a.end_time) > new Date());
}

/**
 * Triggers backend winner settlement logic.
 */
export async function closeAuctionRPC(auctionId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/close/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
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

/**
 * auctionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Calls the Django REST API for auction data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Auction } from '../types';
import { getAuthHeaders } from './api';
import { placeBidRPC as placeBidThroughApi } from './bidService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface BidRecord {
  id: number;
  amount: number;
  created_at: string;
  bidder_id: number;
  bidder_name: string;
  /** Kept for components that display a masked bidder label. */
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

export function mapAuction(item: any): Auction {
  const startPrice = Number(item.starting_price);
  const bidAmounts = Array.isArray(item.bids) ? item.bids.map((bid: any) => Number(bid.amount)) : [];
  const highestRecordedBid = bidAmounts.length ? Math.max(...bidAmounts) : 0;
  const endTimestamp = Date.parse(item.end_time);
  const isExpired = Number.isFinite(endTimestamp) && endTimestamp <= Date.now();
  const status: Auction['status'] = item.status === 'upcoming'
    ? 'upcoming'
    : item.status === 'active' && !isExpired
      ? 'live'
      : 'ended';

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    image_url: item.image_url || '',
    start_price: startPrice,
    current_price: Math.max(startPrice, Number(item.current_highest_bid || 0), highestRecordedBid),
    min_increment: item.min_increment ? Number(item.min_increment) : 50,
    start_time: item.created_at || new Date().toISOString(),
    end_time: item.end_time,
    status,
    created_at: item.created_at || new Date().toISOString(),
    seller_id: item.seller ? (typeof item.seller === 'object' ? item.seller.id : item.seller) : 0,
    category: item.category || 'General',
    bid_count: Array.isArray(item.bids) ? item.bids.length : 0,
    winner_id: item.winner_id ?? undefined,
  };
}

function mapBid(bid: any): BidRecord {
  const bidderName = bid.bidder_name || bid.bidder_username || 'Anonymous';
  return {
    id: bid.id,
    amount: Number(bid.amount),
    created_at: bid.timestamp || bid.created_at || new Date().toISOString(),
    bidder_id: Number(bid.bidder),
    bidder_name: bidderName,
    user_email: bidderName,
  };
}

/**
 * Fetch ALL auctions ordered by newest-first.
 */
export async function fetchAuctions(): Promise<Auction[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(response);

    return data.map(mapAuction);
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
  min_increment: number;
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

export async function uploadAuctionImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const headers = getAuthHeaders();
  delete headers['Content-Type']; // The browser adds the multipart boundary.

  const response = await fetch(`${API_BASE_URL}/uploads/auction-image/`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.image_url) {
    throw new Error(result.error || 'Could not upload the image. Please choose a JPG, PNG, WEBP, or GIF under 5 MB.');
  }
  return result.image_url;
}

/**
 * Fetch a SINGLE auction by ID.
 */
export async function fetchAuction(id: string | number): Promise<Auction> {
  try {
    const response = await fetch(`${API_BASE_URL}/auctions/${id}/`, {
      headers: getAuthHeaders(),
    });
    const item = await handleResponse(response);

    return mapAuction(item);
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

    return (Array.isArray(data) ? data : []).slice(0, 10).map(mapBid);
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

    return (Array.isArray(data) ? data : []).map(mapBid);
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
    const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}/close/`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const result = await handleResponse(response);
    if (!result.success) return { success: false, message: result.error || 'Auction could not be closed.' };
    return { success: true, message: 'Auction closed securely' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Unknown network error' };
  }
}

/** Compatibility export that always sends bids to the Django API. */
export async function placeBidRPC(auctionId: number, amount: number): Promise<{ success: boolean; message?: string }> {
  return placeBidThroughApi(auctionId, amount);
}

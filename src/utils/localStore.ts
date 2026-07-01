/**
 * Local auction store using localStorage.
 * Provides real bid persistence, auction state, and bid history
 * that works even without a Supabase connection.
 */

import type { Auction } from '../types';

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderEmail: string;
  amount: number;
  placedAt: string;
}

const AUCTIONS_KEY = 'bidzo_auctions';
const BIDS_KEY     = 'bidzo_bids';
const STORE_VER    = 'bidzo_store_v6'; // bump to force a data reset

const now  = Date.now();
const DAY  = 1000 * 60 * 60 * 24;

export const DUMMY_AUCTIONS: Auction[] = [
  // ── LIVE auctions ────────────────────────────────────────────────────────
  {
    id: 'dummy-1',
    title: 'HMT Janata Vintage Watch (1978)',
    description:
      'An immaculate HMT Janata mechanical watch from 1978 in stainless steel case. Still features the original hand-wound movement with beautiful gilt finishing on the dial. Keeps excellent time and comes with the original leather strap and box. A prized collector\'s piece of Indian horological heritage.',
    image_url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80',
    start_price:  8000,
    current_price: 9500,
    min_increment: 500,
    start_time: new Date(now - 2 * DAY).toISOString(),
    end_time:   new Date(now + 5 * DAY).toISOString(),
    seller_id: 'seller-1',
    status: 'live',
    category: 'Antiques',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-2',
    title: 'Mughal Miniature Painting on Ivory',
    description:
      'An exquisite 19th-century Mughal style miniature painting rendered in natural pigments on genuine ivory. Depicts a royal court scene with fine detail work. Professionally assessed and authenticated. Comes with acid-free archival framing and certificate of origin.',
    image_url: 'https://images.unsplash.com/photo-1569091791842-7cfb64e04797?auto=format&fit=crop&q=80',
    start_price:  45000,
    current_price: 52000,
    min_increment: 1000,
    start_time: new Date(now - DAY).toISOString(),
    end_time:   new Date(now + 3 * DAY).toISOString(),
    seller_id: 'seller-2',
    status: 'live',
    category: 'Art',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-3',
    title: 'Royal Enfield Bullet 350 (1965)',
    description:
      'A stunning 1965 Royal Enfield Bullet 350cc in original military olive green livery. Fully restored by a certified RE mechanic with matching-numbers engine. Runs beautifully, new wiring, new tyres. All original chrome parts retained. Clear RC and NOC available.',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80',
    start_price:  180000,
    current_price: 210000,
    min_increment: 5000,
    start_time: new Date(now - 3 * DAY).toISOString(),
    end_time:   new Date(now + 4 * DAY).toISOString(),
    seller_id: 'seller-3',
    status: 'live',
    category: 'Vehicles',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-4',
    title: 'Kundan Polki Bridal Jewellery Set',
    description:
      'Handcrafted 22kt gold Kundan Polki necklace, earrings, and maang-tikka set from a renowned Jaipur jeweller. Set with uncut diamonds, natural rubies, and emeralds. Comes in a velvet presentation box with purity hallmark documents and stone certification.',
    image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
    start_price:  250000,
    current_price: 275000,
    min_increment: 5000,
    start_time: new Date(now - DAY).toISOString(),
    end_time:   new Date(now + 6 * DAY).toISOString(),
    seller_id: 'seller-4',
    status: 'live',
    category: 'Jewelry',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-5',
    title: 'Original M. F. Husain Lithograph (Signed)',
    description:
      'Rare signed limited-edition lithograph by the legendary Maqbool Fida Husain from his celebrated "Horses" series, 1992. Edition number 18/50. Authenticated by Pundole\'s Art Gallery, Mumbai. Framed with UV-protective museum glass.',
    image_url: 'https://images.unsplash.com/photo-1541367777708-7905fe3296c0?auto=format&fit=crop&q=80',
    start_price:  120000,
    current_price: 138000,
    min_increment: 2000,
    start_time: new Date(now - 2 * DAY).toISOString(),
    end_time:   new Date(now + 2 * DAY).toISOString(),
    seller_id: 'seller-5',
    status: 'live',
    category: 'Art',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-6',
    title: 'Pashmina Shahtoosh Shawl (Antique)',
    description:
      'An extraordinary antique Shahtoosh shawl from Kashmir, circa 1920. Woven from ultra-fine Tibetan antelope fibres — so delicate it can be pulled through a finger ring. Intricate kani weave border in indigo and saffron. A museum-quality textile heirloom.',
    image_url: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&q=80',
    start_price:  95000,
    current_price: 95000,
    min_increment: 2500,
    start_time: new Date(now - 4 * DAY).toISOString(),
    end_time:   new Date(now + 1 * DAY).toISOString(),
    seller_id: 'seller-6',
    status: 'live',
    category: 'Antiques',
    created_at: new Date().toISOString(),
  },
  // ── NEW LIVE auctions ─────────────────────────────────────────────────────
  {
    id: 'dummy-10',
    title: 'Apple iPhone 15 Pro Max 256GB – Natural Titanium (Sealed)',
    description:
      'Brand-new sealed Apple iPhone 15 Pro Max in Natural Titanium, 256 GB. Purchased from Apple India with full 1-year warranty and original invoice. Features the A17 Pro chip, 48MP ProRAW camera system, and titanium build. Box includes all accessories. Never activated.',
    image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80',
    start_price:  134900,
    current_price: 137500,
    min_increment: 500,
    start_time: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    end_time:   new Date(now + 2 * DAY + 4 * 60 * 60 * 1000).toISOString(),
    seller_id: 'seller-10',
    status: 'live',
    category: 'Electronics',
    created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    extension_count: 0,
  },
  {
    id: 'dummy-11',
    title: 'Handwoven Kanjivaram Pure Silk Saree – Bridal Grand',
    description:
      'An heirloom-quality handwoven Kanjivaram pure mulberry silk saree from a master weaver in Kanchipuram. Deep royal purple body with a 6-inch solid gold zari border and pallu depicting peacocks and temple motifs. Comes with a silk-wrapped box, weaver certificate, and Silk Mark authentication. Perfect bridal trousseau piece.',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80',
    start_price:  28000,
    current_price: 31500,
    min_increment: 500,
    start_time: new Date(now - DAY).toISOString(),
    end_time:   new Date(now + 3 * DAY).toISOString(),
    seller_id: 'seller-11',
    status: 'live',
    category: 'Fashion',
    created_at: new Date(now - DAY).toISOString(),
    extension_count: 0,
  },
  {
    id: 'dummy-12',
    title: 'Custom RTX 4090 Gaming PC – Ultimate Build (2024)',
    description:
      'A beast of a gaming rig built in 2024: Intel Core i9-14900K, ASUS ROG Strix RTX 4090 24 GB OC, 64 GB DDR5-6000 RAM, 4 TB Samsung 990 Pro NVMe SSD, 1200W Corsair Platinum PSU. Full-tower Lian Li O11 Dynamic case with 12 ARGB fans. Runs everything at 4K 144 FPS. Less than 30 hours of total usage. Original bills included.',
    image_url: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&q=80',
    start_price:  320000,
    current_price: 342000,
    min_increment: 2000,
    start_time: new Date(now - 2 * DAY).toISOString(),
    end_time:   new Date(now + 1 * DAY + 6 * 60 * 60 * 1000).toISOString(),
    seller_id: 'seller-12',
    status: 'live',
    category: 'Electronics',
    created_at: new Date(now - 2 * DAY).toISOString(),
    extension_count: 0,
  },
  {
    id: 'dummy-13',
    title: 'Leica M6 Film Camera (1994) – Mint Condition',
    description:
      'A pristine 1994 Leica M6 0.72x rangefinder in classic chrome finish. Shutter tested at all speeds, light seals replaced, viewfinder crystal-clear. Comes with the rare Leica Summicron-M 35mm f/2 ASPH lens, both caps, original strap, and hard leather case. A photographer\'s dream — works perfectly.',
    image_url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&q=80',
    start_price:  180000,
    current_price: 195000,
    min_increment: 2500,
    start_time: new Date(now - 3 * DAY).toISOString(),
    end_time:   new Date(now + 4 * DAY).toISOString(),
    seller_id: 'seller-13',
    status: 'live',
    category: 'Electronics',
    created_at: new Date(now - 3 * DAY).toISOString(),
    extension_count: 0,
  },
  {
    id: 'dummy-14',
    title: 'Rolex Submariner Date Ref. 126610LN (2022)',
    description:
      'A 2022 Rolex Submariner Date in Oystersteel with a black Cerachrom bezel and black dial. Box and papers (carte verte) included. Purchased at Rolex Boutique, Delhi. Unworn — acquired as an investment. Serial matches card. Third-party service report confirming authenticity and perfect movement. A true icon of horological excellence.',
    image_url: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=80',
    start_price:  1100000,
    current_price: 1145000,
    min_increment: 5000,
    start_time: new Date(now - DAY).toISOString(),
    end_time:   new Date(now + 5 * DAY).toISOString(),
    seller_id: 'seller-14',
    status: 'live',
    category: 'Jewelry',
    created_at: new Date(now - DAY).toISOString(),
    extension_count: 0,
  },
  {
    id: 'dummy-15',
    title: 'Sachin Tendulkar Signed Cricket Bat – 2011 World Cup Replica',
    description:
      'An official SG Sunny Gold cricket bat personally signed by Sachin Tendulkar at a fan event in 2014 at Wankhede Stadium. The autograph is in blue marker and includes the date. Accompanied by a photo taken at the signing, a certificate of authenticity issued by a leading sports memorabilia authenticator, and a UV-protective display case. A once-in-a-lifetime collector\'s piece.',
    image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80',
    start_price:  75000,
    current_price: 88000,
    min_increment: 1000,
    start_time: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    end_time:   new Date(now + 6 * DAY).toISOString(),
    seller_id: 'seller-15',
    status: 'live',
    category: 'Sports',
    created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    extension_count: 0,
  },
  // ── UPCOMING auctions ────────────────────────────────────────────────────
  {
    id: 'dummy-7',
    title: 'Apple MacBook Pro M3 Max (Sealed)',
    description:
      'Brand-new sealed-box Apple MacBook Pro 16" with M3 Max chip (16-core CPU, 40-core GPU), 64 GB unified memory, and 2 TB SSD in Space Black. Indian invoice with Apple India warranty. Never opened — gifted unit.',
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80',
    start_price:  280000,
    current_price: 280000,
    min_increment: 2000,
    start_time: new Date(now + 1 * DAY).toISOString(),
    end_time:   new Date(now + 8 * DAY).toISOString(),
    seller_id: 'seller-7',
    status: 'upcoming',
    category: 'Electronics',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-8',
    title: 'Antique Teak Wood Work Desk (1890s)',
    description:
      'A magnificent solid Burma teak roll-top writing desk from the late colonial era, circa 1890s. Features 12 hand-dove-tailed drawers, original brass fittings, and a leather-inlaid writing surface. Professionally restored by a master craftsman in Kolkata.',
    image_url: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80',
    start_price:  65000,
    current_price: 65000,
    min_increment: 1000,
    start_time: new Date(now + 2 * DAY).toISOString(),
    end_time:   new Date(now + 9 * DAY).toISOString(),
    seller_id: 'seller-8',
    status: 'upcoming',
    category: 'Antiques',
    created_at: new Date().toISOString(),
  },
  {
    id: 'dummy-9',
    title: 'Sanskrit Palm-Leaf Manuscript (17th C.)',
    description:
      'An exceptionally rare set of 42 palm-leaf pages from a 17th-century Sanskrit Ayurvedic treatise, sourced from a Kerala math. Ink inscriptions remain vivid. Preserved in a handmade sandalwood case. Provenance documentation and academic assessment letter included.',
    image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80',
    start_price:  350000,
    current_price: 350000,
    min_increment: 10000,
    start_time: new Date(now + 3 * DAY).toISOString(),
    end_time:   new Date(now + 12 * DAY).toISOString(),
    seller_id: 'seller-9',
    status: 'upcoming',
    category: 'Antiques',
    created_at: new Date().toISOString(),
  },
];

export function initLocalStore() {
  // Force a reset whenever we bump STORE_VER
  if (!localStorage.getItem(STORE_VER)) {
    localStorage.removeItem(AUCTIONS_KEY);
    localStorage.removeItem(BIDS_KEY);
    localStorage.setItem(STORE_VER, '1');
  }
  const existing = localStorage.getItem(AUCTIONS_KEY);
  if (!existing || JSON.parse(existing).length === 0) {
    saveAuctions(DUMMY_AUCTIONS);
  }
}



// ── Auction CRUD ───────────────────────────────────────────────

export function loadAuctions(): Auction[] {
  try {
    const raw = localStorage.getItem(AUCTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAuctions(auctions: Auction[]) {
  localStorage.setItem(AUCTIONS_KEY, JSON.stringify(auctions));
}

export function upsertAuction(auction: Auction) {
  const all = loadAuctions();
  const idx = all.findIndex(a => a.id === auction.id);
  if (idx >= 0) all[idx] = auction;
  else all.unshift(auction);
  saveAuctions(all);
}

export function getAuction(id: string): Auction | null {
  return loadAuctions().find(a => a.id === id) ?? null;
}

// ── Bids CRUD ──────────────────────────────────────────────────

export function loadBids(): Bid[] {
  try {
    const raw = localStorage.getItem(BIDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBids(bids: Bid[]) {
  localStorage.setItem(BIDS_KEY, JSON.stringify(bids));
}

export function getBidsForAuction(auctionId: string): Bid[] {
  return loadBids()
    .filter(b => b.auctionId === auctionId)
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

export function placeBid(bid: Omit<Bid, 'id' | 'placedAt'>): Bid {
  const auctions = loadAuctions();
  const idx = auctions.findIndex(a => a.id === bid.auctionId);
  if (idx < 0) throw new Error('Auction not found');

  const auction = auctions[idx];
  const minBid = auction.current_price + auction.min_increment;
  
  if (bid.amount < minBid) {
    throw new Error(`Bid must be at least ${minBid} (current price + min increment)`);
  }

  const existingBids = getBidsForAuction(bid.auctionId);
  if (existingBids.length > 0 && existingBids[0].bidderId === bid.bidderId) {
    throw new Error('You already have the highest bid');
  }

  const newBid: Bid = {
    ...bid,
    id: `bid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    placedAt: new Date().toISOString(),
  };

  const bids = loadBids();
  bids.push(newBid);
  saveBids(bids);

  // Update auction current price
  auctions[idx].current_price = bid.amount;
  saveAuctions(auctions);

  return newBid;
}

// Emit a custom event so other components can react to bid changes
export function emitBidEvent(auctionId: string, amount: number) {
  window.dispatchEvent(new CustomEvent('bidzo:bid', { detail: { auctionId, amount } }));
}

/**
 * Anti-sniping: extends auction end_time by 30 seconds (max 3 times).
 * Returns the updated auction, or null if already at max extensions.
 */
export function extendAuctionTime(auctionId: string): Auction | null {
  const auctions = loadAuctions();
  const idx = auctions.findIndex(a => a.id === auctionId);
  if (idx < 0) return null;

  const auction = auctions[idx];
  const count = auction.extension_count ?? 0;
  if (count >= 3) return null; // max extensions reached

  const extended = {
    ...auction,
    end_time: new Date(new Date(auction.end_time).getTime() + 30_000).toISOString(),
    extension_count: count + 1,
  };
  auctions[idx] = extended;
  saveAuctions(auctions);

  // Notify listeners
  window.dispatchEvent(
    new CustomEvent('bidzo:extend', { detail: { auctionId, newEndTime: extended.end_time } }),
  );

  return extended;
}

/**
 * Create a new auction in offline localStorage mode.
 */
export function createAuction(params: {
  title: string;
  description: string;
  imageUrl: string;
  startPrice: number;
  minIncrement: number;
  endTime: string;
  sellerId: string;
  category: string;
}): Auction {
  const newAuction: Auction = {
    id: `auction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title:         params.title,
    description:   params.description,
    image_url:     params.imageUrl,
    start_price:   params.startPrice,
    current_price: params.startPrice,
    min_increment: params.minIncrement,
    start_time:    new Date().toISOString(),
    end_time:      params.endTime,
    seller_id:     params.sellerId,
    category:      params.category,
    status:        'live',
    created_at:    new Date().toISOString(),
    extension_count: 0,
  };

  const all = loadAuctions();
  all.unshift(newAuction); // prepend so it shows first
  saveAuctions(all);
  return newAuction;
}



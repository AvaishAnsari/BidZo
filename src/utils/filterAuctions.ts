// src/utils/filterAuctions.ts
/**
 * Utility to filter auction items based on category, status, price, etc.
 * Mirrors the logic used in Home.tsx but extracted for unit testing.
 */

export type Auction = {
  id: number;
  title: string;
  description: string;
  category?: string;
  status: 'live' | 'upcoming' | 'ended';
  current_price: number;
  created_at: string;
  end_time: string;
  bid_count?: number;
};

export type FilterOptions = {
  filterCategory: string; // 'all' or a main category key
  filterStatus?: string; // 'all' | 'live' | 'upcoming' | 'ended'
  minPrice?: string;
  maxPrice?: string;
  timeRemaining?: string; // 'all' | '24_hours' | '7_days'
  sortBy?: 'ending_soon' | 'newly_listed' | 'price_asc' | 'price_desc';
};

/** Mapping of UI categories to DummyJSON sub‑categories */
const CATEGORY_ALIASES: Record<string, string[]> = {
  Electronics: ['Smartphones', 'Laptops', 'Tablets', 'Mobile Accessories', 'Electronics'],
  Fashion: ['Beauty', 'Fragrances', 'Skin Care', 'Womens Dresses', 'Tops', 'Mens Shirts', 'Womens Shoes', 'Mens Shoes', 'Fashion'],
  Watches: ['Womens Watches', 'Mens Watches', 'Watches'],
  Jewelry: ['Womens Jewellery', 'Mens Jewellery', 'Jewelry'],
  Antiques: ['Furniture', 'Home Decoration', 'Kitchen Accessories', 'Antiques'],
  Vehicles: ['Vehicle', 'Motorcycle', 'Vehicles'],
  Sports: ['Sports Accessories', 'Sports'],
  Collectibles: ['Groceries', 'Collectibles'],
};

export function filterAuctions(auctions: Auction[], opts: FilterOptions): Auction[] {
  let result = [...auctions];

  // Category filter – includes aliases
  if (opts.filterCategory && opts.filterCategory !== 'all') {
    const allowed = CATEGORY_ALIASES[opts.filterCategory] || [];
    result = result.filter(
      (a) => a.category === opts.filterCategory || allowed.includes(a.category ?? ''),
    );
  }

  // Status filter (optional)
  if (opts.filterStatus && opts.filterStatus !== 'all') {
    result = result.filter((a) => a.status === opts.filterStatus);
  }

  // Price filters
  if (opts.minPrice) {
    const min = parseFloat(opts.minPrice);
    if (!isNaN(min)) result = result.filter((a) => a.current_price >= min);
  }
  if (opts.maxPrice) {
    const max = parseFloat(opts.maxPrice);
    if (!isNaN(max)) result = result.filter((a) => a.current_price <= max);
  }

  // Time‑remaining filter – simplified
  if (opts.timeRemaining && opts.timeRemaining !== 'all') {
    const now = Date.now();
    result = result.filter((a) => {
      const remaining = new Date(a.end_time).getTime() - now;
      if (opts.timeRemaining === '24_hours') return remaining > 0 && remaining <= 86400000;
      if (opts.timeRemaining === '7_days') return remaining > 0 && remaining <= 604800000;
      return true;
    });
  }

  // Sorting (optional)
  if (opts.sortBy) {
    result.sort((a, b) => {
      switch (opts.sortBy) {
        case 'ending_soon':
          return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
        case 'newly_listed':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price_asc':
          return a.current_price - b.current_price;
        case 'price_desc':
          return b.current_price - a.current_price;
        default:
          return 0;
      }
    });
  }

  return result;
}

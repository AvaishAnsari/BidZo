export const AUCTION_CATEGORIES = [
  'Beaded Jewelry',
  'Loose Beads & Gemstones',
  'Beading Kits & Supplies',
  'Tools & Findings',
  'Patterns & Tutorials',
  'Bead Art & Decor',
  'Vintage & Collectible Beads',
  'Other',
] as const;

/** Legacy auction categories are grouped into the new bead-focused storefront. */
export const AUCTION_CATEGORY_ALIASES: Record<string, string[]> = {
  'Beaded Jewelry': ['Beaded Jewelry', 'Jewelry', 'Womens Jewellery', 'Mens Jewellery'],
  'Loose Beads & Gemstones': ['Loose Beads & Gemstones', 'Loose Beads', 'Beads & Gemstones', 'Gemstones'],
  'Beading Kits & Supplies': ['Beading Kits & Supplies', 'Beading Kits', 'Kits & Supplies'],
  'Tools & Findings': ['Tools & Findings', 'Tools', 'Findings'],
  'Patterns & Tutorials': ['Patterns & Tutorials', 'Patterns', 'Tutorials'],
  'Bead Art & Decor': ['Bead Art & Decor', 'Art', 'Home Decoration', 'Kitchen Accessories'],
  'Vintage & Collectible Beads': ['Vintage & Collectible Beads', 'Vintage Beads', 'Antiques', 'Collectibles'],
  Other: [
    'Other', 'General', 'Watches', 'Electronics', 'Vehicles', 'Books', 'Fashion', 'Sports',
    'Real Estate', 'Smartphones', 'Laptops', 'Tablets', 'Mobile Accessories', 'Beauty',
    'Fragrances', 'Skin Care', 'Womens Dresses', 'Tops', 'Mens Shirts', 'Womens Shoes',
    'Mens Shoes', 'Womens Watches', 'Mens Watches', 'Furniture', 'Vehicle', 'Motorcycle',
    'Sports Accessories', 'Groceries',
  ],
};

export function getAuctionCategoryGroup(category?: string | null): string | undefined {
  if (!category) return undefined;
  return Object.entries(AUCTION_CATEGORY_ALIASES)
    .find(([, aliases]) => aliases.includes(category))?.[0];
}

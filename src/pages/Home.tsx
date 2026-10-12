import { useState, useMemo, useEffect } from 'react';
import { useAuctions } from '../hooks/useAuctions';
import { AuctionCard } from '../components/AuctionCard';
import { Loader2, RefreshCw, Flame, Search, Filter, TrendingUp, Clock, Layers, ChevronLeft, ChevronRight, Tag, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AUCTION_CATEGORIES } from './CreateAuction';
import { useWatchlist } from '../hooks/useWatchlist';

const HERO_SLIDES = [
  {
    title: "Luxury Watches",
    subtitle: "Premium Collections",
    desc: "Timeless pieces, exclusive auctions.",
    img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1200&auto=format&fit=crop",
    link: "/auctions"
  },
  {
    title: "Classic Vehicles",
    subtitle: "Vintage Motors",
    desc: "Own a piece of automotive history.",
    img: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=1200&auto=format&fit=crop",
    link: "/auctions"
  },
  {
    title: "Fine Art",
    subtitle: "Curated Masterpieces",
    desc: "Investment grade artwork from top creators.",
    img: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop",
    link: "/auctions"
  }
];

import { Link, useSearchParams } from 'react-router-dom';
import CategoryBrowser from '../components/CategoryBrowser';

export const Home = () => {
  const { auctions, isLoading, error, refetch } = useAuctions();
  const { watchlist } = useWatchlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<'all' | '24_hours' | '7_days'>('all');
  const [sortBy, setSortBy] = useState<'ending_soon' | 'newly_listed' | 'price_asc' | 'price_desc'>('newly_listed');
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyWishlist, setShowOnlyWishlist] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setFilterCategory(cat);
    }
  }, [searchParams]);

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(s => (s + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const activeFiltersCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (filterCategory !== 'all' ? 1 : 0) +
    (minPrice !== '' ? 1 : 0) +
    (maxPrice !== '' ? 1 : 0) +
    (timeRemaining !== 'all' ? 1 : 0) +
    (showOnlyWishlist ? 1 : 0);

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setTimeRemaining('all');
    setSortBy('newly_listed');
    setShowOnlyWishlist(false);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const CATEGORY_ALIASES: Record<string, string[]> = {
      'Electronics': ['Smartphones', 'Laptops', 'Tablets', 'Mobile Accessories', 'Electronics'],
      'Fashion': ['Beauty', 'Fragrances', 'Skin Care', 'Womens Dresses', 'Tops', 'Mens Shirts', 'Womens Shoes', 'Mens Shoes', 'Fashion'],
      'Watches': ['Womens Watches', 'Mens Watches', 'Watches'],
      'Jewelry': ['Womens Jewellery', 'Mens Jewellery', 'Jewelry'],
      'Antiques': ['Furniture', 'Home Decoration', 'Kitchen Accessories', 'Antiques'],
      'Vehicles': ['Vehicle', 'Motorcycle', 'Vehicles'],
      'Sports': ['Sports Accessories', 'Sports'],
      'Collectibles': ['Groceries', 'Collectibles'],
    };

    auctions.forEach(a => {
      if (!a.category) return;
      let mainCategory = a.category;
      for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
        if (aliases.includes(a.category)) {
          mainCategory = key;
          break;
        }
      }
      counts[mainCategory] = (counts[mainCategory] || 0) + 1;
    });
    return counts;
  }, [auctions]);

  // Live stats
  const liveCount = auctions.filter(a => a.status === 'live').length;
  const totalBids = auctions.reduce((s, a) => s + (a.bid_count ?? 0), 0);
  const endingSoonCount = auctions.filter(a => {
    if (a.status !== 'live') return false;
    const ms = new Date(a.end_time).getTime() - Date.now();
    return ms > 0 && ms <= 3600000;
  }).length;

  // Apply filters and sorting
  const filteredAndSortedAuctions = useMemo(() => {
    let result = [...auctions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }

    if (showOnlyWishlist) {
      result = result.filter(a => watchlist.includes(a.id));
    }

    if (filterStatus !== 'all') {
      result = result.filter(a => a.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      const CATEGORY_ALIASES: Record<string, string[]> = {
        'Electronics': ['Smartphones', 'Laptops', 'Tablets', 'Mobile Accessories', 'Electronics'],
        'Fashion': ['Beauty', 'Fragrances', 'Skin Care', 'Womens Dresses', 'Tops', 'Mens Shirts', 'Womens Shoes', 'Mens Shoes', 'Fashion'],
        'Watches': ['Womens Watches', 'Mens Watches', 'Watches'],
        'Jewelry': ['Womens Jewellery', 'Mens Jewellery', 'Jewelry'],
        'Antiques': ['Furniture', 'Home Decoration', 'Kitchen Accessories', 'Antiques'],
        'Vehicles': ['Vehicle', 'Motorcycle', 'Vehicles'],
        'Sports': ['Sports Accessories', 'Sports'],
        'Collectibles': ['Groceries', 'Collectibles'],
      };

      const allowed = CATEGORY_ALIASES[filterCategory] || [];
      result = result.filter(a => a.category === filterCategory || allowed.includes(a.category ?? ''));
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) result = result.filter(a => a.current_price >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) result = result.filter(a => a.current_price <= max);
    }

    if (timeRemaining !== 'all') {
      const now = Date.now();
      result = result.filter(a => {
        const remaining = new Date(a.end_time).getTime() - now;
        if (timeRemaining === '24_hours') return remaining > 0 && remaining <= 86400000;
        if (timeRemaining === '7_days') return remaining > 0 && remaining <= 604800000;
        return true;
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'ending_soon': return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
        case 'newly_listed': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price_asc': return a.current_price - b.current_price;
        case 'price_desc': return b.current_price - a.current_price;
        default: return 0;
      }
    });

    return result;
  }, [auctions, searchQuery, filterStatus, filterCategory, minPrice, maxPrice, timeRemaining, sortBy, showOnlyWishlist, watchlist]);

  const trendingAuctions = [...auctions]
    .filter(a => a.status === 'live' && new Date(a.end_time).getTime() > Date.now())
    .sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime())
    .slice(0, 3);

  const handleCategoryChange = (key: string) => {
    setFilterCategory(key === 'all' ? 'all' : key);
  };

  return (
    <div className="w-full pb-16">
      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="pt-10 pb-8"
      >
        <div className="flex flex-col lg:flex-row gap-8 mb-10 relative">
          {/* Left Text Content */}
          <div className="flex-1 flex flex-col justify-center max-w-xl">
            <h1 className="text-[3.5rem] md:text-[4.5rem] lg:text-[5rem] font-extrabold tracking-tight text-[var(--text-main)] mb-4 leading-[1.05]">
              Discover. Bid.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] drop-shadow-sm">
                Win.
              </span>
            </h1>
            <p className="text-base md:text-lg text-[var(--text-muted)] mb-8 max-w-lg leading-relaxed font-medium">
              Real-time auctions for unique items, collectibles, electronics,
              fashion and more. Join BidZo and be part of the next generation
              of online bidding.
            </p>
            <div className="flex gap-4">
              <Link to="/auctions" className="bg-[var(--primary)] text-white px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 hover:shadow-[var(--primary)]/40 transition-all text-sm no-underline">
                <Search className="w-5 h-5" /> Explore Auctions &rarr;
              </Link>
              <Link to="/create-auction" className="bg-transparent border-2 border-[var(--primary)]/20 text-[var(--primary)] px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[var(--primary)]/10 transition-all text-sm no-underline">
                <Tag className="w-5 h-5" /> Start Selling
              </Link>
            </div>
          </div>

          {/* Right Banner Image */}
          <div className="flex-[1.2] min-w-[50%]">
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 h-[380px] shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img src={HERO_SLIDES[currentSlide].img} alt={HERO_SLIDES[currentSlide].title} className="w-full h-full object-cover opacity-70" />
                  <div className="absolute inset-0 p-10 lg:pl-16 flex flex-col justify-center text-white z-10 bg-gradient-to-r from-black/90 via-black/50 to-transparent">
                    <span className="text-xs uppercase tracking-widest text-white/70 font-bold mb-3 flex items-center gap-2">{HERO_SLIDES[currentSlide].subtitle}</span>
                    <h2 className="text-4xl lg:text-5xl font-extrabold mb-3 text-white">{HERO_SLIDES[currentSlide].title}</h2>
                    <p className="text-white/80 max-w-xs mb-8 text-sm leading-relaxed">{HERO_SLIDES[currentSlide].desc}</p>
                    <Link to={HERO_SLIDES[currentSlide].link} className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-bold w-max flex items-center gap-2 hover:bg-gray-100 transition-colors text-xs uppercase tracking-wide no-underline shadow-lg shadow-white/10">
                      View Auctions &rarr;
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute right-6 bottom-6 flex gap-3 z-20">
                <button
                  onClick={() => setCurrentSlide(s => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all border border-white/20 cursor-pointer">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentSlide(s => (s + 1) % HERO_SLIDES.length)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all border border-white/20 cursor-pointer">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              <div className="absolute left-10 lg:left-16 bottom-8 flex gap-2 z-20">
                {HERO_SLIDES.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${i === currentSlide ? 'bg-white shadow-sm scale-110' : 'bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 mb-12"
        >
          {[
            { icon: <Flame className="w-6 h-6 text-[#10b981]" />, iconBg: 'bg-[#10b981]/10', value: liveCount, label: 'Live Auctions' },
            { icon: <TrendingUp className="w-6 h-6 text-[#8b5cf6]" />, iconBg: 'bg-[#8b5cf6]/10', value: totalBids, label: 'Total Bids Today' },
            { icon: <Clock className="w-6 h-6 text-[#ef4444]" />, iconBg: 'bg-[#ef4444]/10', value: endingSoonCount, label: 'Ending < 1 Hour' },
            { icon: <Heart className={`w-6 h-6 ${watchlist.length > 0 ? 'fill-red-500 text-red-500' : 'text-red-400'}`} />, iconBg: 'bg-red-500/10', value: watchlist.length, label: 'My Wishlist', isWishlist: true },
            { icon: <Layers className="w-6 h-6 text-[#0ea5e9]" />, iconBg: 'bg-[#0ea5e9]/10', value: auctions.length, label: 'Total Auctions' },
          ].map(({ icon, iconBg, value, label, isWishlist }: any) => (
            <div
              key={label}
              onClick={isWishlist ? () => setShowOnlyWishlist(prev => !prev) : undefined}
              className={`flex items-center gap-3.5 py-4 px-5 bg-[var(--elevated)] border rounded-2xl shadow-sm transition-all ${
                isWishlist
                  ? `cursor-pointer hover:shadow-md ${showOnlyWishlist ? 'border-red-500 ring-2 ring-red-500/30 bg-red-500/5' : 'border-[var(--border)] hover:border-red-500/40'}`
                  : 'border-[var(--border)] hover:shadow-md'
              }`}
              title={isWishlist ? 'Click to filter your wishlist items' : undefined}
            >
              <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div>
                <div className="text-xl font-extrabold text-[var(--text-main)] leading-none mb-1.5">{value}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">{label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* ── Category Browser ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <CategoryBrowser
          selected={filterCategory}
          onChange={handleCategoryChange}
          counts={categoryCounts}
        />
      </motion.div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
          <p className="text-[var(--primary)] text-sm tracking-[0.15em] uppercase font-bold">
            Loading Auctions...
          </p>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="market-card rounded-3xl p-16 text-center max-w-2xl mx-auto"
        >
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-[var(--danger)] text-xl font-bold mb-2">
            Failed to Load
          </h3>
          <p className="text-[var(--text-muted)] text-sm mb-6">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)]/10 border border-[var(--primary)]/40 rounded-xl text-[var(--primary)] font-bold text-sm cursor-pointer hover:bg-[var(--primary)]/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </motion.div>
      ) : auctions.length > 0 ? (
        <div className="flex flex-col gap-12">

          {/* ── Search & Filter Bar ── */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center flex-wrap md:flex-nowrap">
              <div className="flex-1 min-w-[200px] flex items-center bg-[var(--elevated)] border border-[var(--border)] rounded-full px-4 py-3 focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)] transition-all">
                <Search className="text-[var(--text-muted)] w-4 h-4 shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Search auctions, products and categories..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] font-medium"
                />
              </div>

              {/* Sort select */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="py-3 px-4 rounded-full bg-[var(--elevated)] border border-[var(--border)] text-[var(--text-main)] outline-none font-bold text-sm cursor-pointer min-w-[160px] focus:border-[var(--primary)]"
              >
                <option value="ending_soon">Ending Soonest</option>
                <option value="newly_listed">Newly Listed</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>

              {/* Wishlist toggle button */}
              <button
                onClick={() => setShowOnlyWishlist(prev => !prev)}
                className={`flex items-center gap-2 py-3 px-5 border rounded-full cursor-pointer font-bold relative transition-all text-sm shrink-0 ${
                  showOnlyWishlist
                    ? 'bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.35)]'
                    : 'bg-transparent border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--elevated)] hover:border-red-500/40'
                }`}
                title="Filter auctions saved in your wishlist"
              >
                <Heart className={`w-4 h-4 ${showOnlyWishlist || watchlist.length > 0 ? 'fill-current text-red-500' : ''}`} />
                <span>Wishlist</span>
                {watchlist.length > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
                    showOnlyWishlist ? 'bg-white text-red-600' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {watchlist.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 py-3 px-6 border rounded-full cursor-pointer font-bold relative transition-all text-sm ${
                  showFilters ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-transparent border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--elevated)]'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[var(--primary)] text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-[var(--elevated)] rounded-2xl border border-[var(--border)] shadow-sm mt-2"
                >
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                      <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase text-[var(--text-muted)] font-bold tracking-wider">Status</label>
                        <select
                          value={filterStatus}
                          onChange={e => setFilterStatus(e.target.value as any)}
                          className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                        >
                          <option value="all">All Auctions</option>
                          <option value="live">Live Now</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="ended">Ended</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase text-[var(--text-muted)] font-bold tracking-wider">Category</label>
                        <select
                          value={filterCategory}
                          onChange={e => setFilterCategory(e.target.value)}
                          className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                        >
                          <option value="all">All Categories</option>
                          {AUCTION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase text-[var(--text-muted)] font-bold tracking-wider">Price Range</label>
                        <div className="flex gap-2 items-center">
                          <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                            className="w-full p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
                          <span className="text-[var(--text-muted)]">–</span>
                          <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                            className="w-full p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs uppercase text-[var(--text-muted)] font-bold tracking-wider">Ends In</label>
                        <select
                          value={timeRemaining}
                          onChange={e => setTimeRemaining(e.target.value as any)}
                          className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                        >
                          <option value="all">Any Time</option>
                          <option value="24_hours">Less than 24 hours</option>
                          <option value="7_days">Less than 7 days</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={resetFilters}
                        className="flex items-center gap-2 bg-transparent border-none text-[var(--danger)] text-sm font-bold cursor-pointer px-4 py-2 rounded-lg transition-colors hover:bg-[var(--danger)]/10"
                      >
                        <RefreshCw className="w-4 h-4" /> Reset Filters
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Wishlist Active Filter Banner ── */}
          {showOnlyWishlist && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                <span>Showing {filteredAndSortedAuctions.length} item{filteredAndSortedAuctions.length === 1 ? '' : 's'} in your Wishlist</span>
              </div>
              <button
                onClick={() => setShowOnlyWishlist(false)}
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-white px-3.5 py-1.5 rounded-lg font-semibold transition-colors border border-red-500/40 cursor-pointer"
              >
                Show All Auctions
              </button>
            </motion.div>
          )}

          {/* ── Trending Section (hidden when filtering by Wishlist) ── */}
          {!showOnlyWishlist && filterCategory === 'all' && !searchQuery && (
            <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center">
                  <Flame className="w-6 h-6 text-[#ef4444] mr-2 shrink-0" />
                  <h2 className="text-2xl font-black m-0 text-[var(--text-main)]">
                    Trending Now
                  </h2>
                </div>
                <span className="bg-[#10b981]/10 text-[#10b981] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-[#10b981]/20">
                  Ending Soon
                </span>
                <Link to="/auctions" className="ml-auto text-[var(--primary)] font-bold text-sm flex items-center gap-1 hover:underline no-underline shrink-0">
                  View All &rarr;
                </Link>
              </div>

              {trendingAuctions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {trendingAuctions.map(auction => (
                    <motion.div key={auction.id} whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <AuctionCard auction={auction} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-[var(--elevated)] rounded-2xl border border-dashed border-[var(--border)] text-[var(--text-muted)]">
                  No live auctions available right now.
                </div>
              )}
            </motion.div>
          )}

          {/* ── All Auctions ── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
          >
            <div className="flex items-center mb-6 gap-3">
              <h2 className="text-2xl font-black m-0 text-[var(--text-main)] flex items-center gap-2">
                {showOnlyWishlist && <Heart className="w-6 h-6 fill-red-500 text-red-500" />}
                {showOnlyWishlist ? 'Your Wishlist' : filterCategory !== 'all' ? filterCategory : 'All Live Auctions'}
              </h2>
              {filteredAndSortedAuctions.length > 0 && (
                <span className={`border rounded-full px-3 py-1 text-xs font-bold ${
                  showOnlyWishlist
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30'
                }`}>
                  {filteredAndSortedAuctions.length}
                </span>
              )}
            </div>

            {filteredAndSortedAuctions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {filteredAndSortedAuctions.map(auction => (
                  <motion.div
                    key={auction.id}
                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } } }}
                  >
                    <AuctionCard auction={auction} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-16 text-center border border-dashed border-[var(--border)] rounded-2xl bg-[var(--elevated)]"
              >
                {showOnlyWishlist ? (
                  <>
                    <div className="text-5xl mb-4">❤️</div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Your Wishlist is Empty</h3>
                    <p className="text-[var(--text-muted)] text-sm m-0 mb-4">Tap the heart icon on any auction card to save it to your wishlist for quick tracking.</p>
                    <button
                      onClick={() => setShowOnlyWishlist(false)}
                      className="bg-[var(--primary)] text-white rounded-xl px-5 py-2 cursor-pointer font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      Browse All Auctions
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-[var(--text-muted)] text-base m-0">No auctions match your criteria.</p>
                    <button
                      onClick={resetFilters}
                      className="mt-4 bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] rounded-xl px-5 py-2 cursor-pointer font-bold text-sm"
                    >
                      Reset Filters
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      ) : (
        /* ── Empty State ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="market-card rounded-3xl p-20 text-center max-w-2xl mx-auto"
        >
          <div className="text-6xl mb-5">🎨</div>
          <h3 className="text-[var(--text-main)] text-2xl font-bold mb-2">
            No Active Auctions
          </h3>
          <p className="text-[var(--text-muted)] text-base">
            Check back later for new items.
          </p>
        </motion.div>
      )}
    </div>
  );
};

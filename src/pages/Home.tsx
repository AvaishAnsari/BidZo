import { useState, useMemo } from 'react';
import { useAuctions } from '../hooks/useAuctions';
import { AuctionCard } from '../components/AuctionCard';
import { Loader2, Zap, RefreshCw, Flame, Search, Filter, TrendingUp, Clock, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { AUCTION_CATEGORIES } from './CreateAuction';
import { useTranslation } from 'react-i18next';
import CategoryBrowser from '../components/CategoryBrowser';

export const Home = () => {
  const { auctions, isLoading, error, refetch } = useAuctions();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<'all' | '24_hours' | '7_days'>('all');
  const [sortBy, setSortBy] = useState<'ending_soon' | 'newly_listed' | 'price_asc' | 'price_desc'>('ending_soon');
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (filterCategory !== 'all' ? 1 : 0) +
    (minPrice !== '' ? 1 : 0) +
    (maxPrice !== '' ? 1 : 0) +
    (timeRemaining !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setTimeRemaining('all');
    setSortBy('ending_soon');
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    auctions.forEach(a => {
      if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
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

    if (filterStatus !== 'all') {
      result = result.filter(a => a.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      result = result.filter(a => a.category === filterCategory);
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
  }, [auctions, searchQuery, filterStatus, filterCategory, minPrice, maxPrice, timeRemaining, sortBy]);

  const trendingAuctions = [...auctions]
    .filter(a => a.status === 'live')
    .sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime())
    .slice(0, 3);

  // Handle category browser selection (maps 'all' key to filterCategory)
  const handleCategoryChange = (key: string) => {
    setFilterCategory(key === 'all' ? 'all' : key);
  };

  return (
    <div style={{ width: '100%', paddingBottom: '4rem' }}>

      {/* ── Hero Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ textAlign: 'center', padding: '4rem 0 2.5rem', position: 'relative', overflow: 'visible' }}
      >
        <div className="hero-glow" />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="section-label"
          style={{ marginBottom: '1.5rem' }}
        >
          <Zap style={{ width: '0.9rem', height: '0.9rem', color: '#c084fc' }} />
          {t('nextGenerationBidding')}
        </motion.div>

        <h1
          className="text-glow"
          style={{
            margin: '0 0 1rem 0', padding: 0,
            fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.08,
            color: isDark ? '#ffffff' : '#111827',
            position: 'relative', zIndex: 1,
          }}
        >
          <span style={{ display: 'block', fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
            {t('discoverPremium')}
          </span>
          <span className="gradient-text" style={{ display: 'block', fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
            {t('liveAuctions')}
          </span>
        </h1>

        <p style={{
          fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)',
          color: isDark ? '#9ca3af' : '#4b5563',
          maxWidth: '40rem', margin: '0 auto 2rem',
          fontWeight: 300, lineHeight: 1.75,
        }}>
          {t('heroSubtext')}
        </p>

        {/* Live Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'inline-flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center',
            padding: '0.8rem 2rem',
            background: isDark ? 'rgba(15,12,40,0.6)' : 'rgba(255,255,255,0.8)',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(209,213,219,0.8)'}`,
            borderRadius: '1rem', backdropFilter: 'blur(12px)',
          }}
        >
          {[
            { icon: <Flame size={15} color="#ef4444" />, value: liveCount, label: 'Live Now', color: '#4ade80' },
            { icon: <TrendingUp size={15} color="#818cf8" />, value: totalBids, label: 'Total Bids', color: '#a5b4fc' },
            { icon: <Clock size={15} color="#fbbf24" />, value: endingSoonCount, label: 'Ending < 1h', color: '#fbbf24' },
            { icon: <Layers size={15} color="#c084fc" />, value: auctions.length, label: 'Auctions', color: '#c084fc' },
          ].map(({ icon, value, label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {icon}
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{value}</span>
              <span style={{ fontSize: '0.75rem', color: isDark ? '#6b7280' : '#9ca3af', fontWeight: 500 }}>{label}</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0', gap: '1rem' }}>
          <Loader2 style={{ width: '3rem', height: '3rem', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#818cf8', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
            {t('loadingAuctions')}
          </p>
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{ borderRadius: '1.5rem', padding: '4rem 2rem', textAlign: 'center', maxWidth: '40rem', margin: '0 auto' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ color: '#f87171', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {t('failedToLoad')}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={refetch}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.5rem',
              background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '0.75rem',
              color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: '0.9rem', height: '0.9rem' }} /> {t('tryAgain')}
          </button>
        </motion.div>
      ) : auctions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* ── Search & Filter Bar ── */}
          <div className="glass-card" style={{ padding: '1rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', width: '1.2rem', height: '1.2rem' }} />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem',
                    background: isDark ? 'rgba(17,24,39,0.7)' : '#ffffff',
                    border: isDark ? '1px solid rgba(75,85,99,0.6)' : '1px solid #d1d5db',
                    borderRadius: '0.75rem', color: isDark ? 'white' : '#111827',
                    outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.target.style.borderColor = isDark ? 'rgba(75,85,99,0.6)' : '#d1d5db'}
                />
              </div>

              {/* Sort select */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  padding: '0.85rem 1rem', borderRadius: '0.75rem',
                  background: isDark ? 'rgba(17,24,39,0.7)' : '#ffffff',
                  border: isDark ? '1px solid rgba(75,85,99,0.6)' : '1px solid #d1d5db',
                  color: isDark ? 'white' : '#111827', outline: 'none',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                <option value="ending_soon">{t('endingSoonest')}</option>
                <option value="newly_listed">{t('newlyListed')}</option>
                <option value="price_asc">{t('priceLowHigh')}</option>
                <option value="price_desc">{t('priceHighLow')}</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.85rem 1.25rem',
                  background: showFilters ? 'rgba(99,102,241,0.2)' : 'rgba(75,85,99,0.2)',
                  border: `1px solid ${showFilters ? 'rgba(99,102,241,0.5)' : 'rgba(75,85,99,0.4)'}`,
                  color: showFilters ? '#a5b4fc' : (isDark ? '#d1d5db' : '#4b5563'),
                  borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  position: 'relative', transition: 'all 0.2s',
                }}
              >
                <Filter style={{ width: '1.1rem', height: '1.1rem' }} />
                {t('filters')}
                {activeFiltersCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-0.4rem', right: '-0.4rem',
                    background: '#6366f1', color: 'white', borderRadius: '50%',
                    width: '1.25rem', height: '1.25rem', fontSize: '0.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                  }}>
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
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(75,85,99,0.3)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>{t('status')}</label>
                        <select
                          value={filterStatus}
                          onChange={e => setFilterStatus(e.target.value as any)}
                          style={{ padding: '0.65rem', borderRadius: '0.5rem', background: isDark ? '#1f2937' : '#f3f4f6', border: isDark ? '1px solid #374151' : '1px solid #d1d5db', color: isDark ? 'white' : 'black', outline: 'none' }}
                        >
                          <option value="all">{t('allAuctions')}</option>
                          <option value="live">{t('liveNow')}</option>
                          <option value="upcoming">{t('upcoming')}</option>
                          <option value="ended">{t('ended')}</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>{t('category')}</label>
                        <select
                          value={filterCategory}
                          onChange={e => setFilterCategory(e.target.value)}
                          style={{ padding: '0.65rem', borderRadius: '0.5rem', background: isDark ? '#1f2937' : '#f3f4f6', border: isDark ? '1px solid #374151' : '1px solid #d1d5db', color: isDark ? 'white' : 'black', outline: 'none' }}
                        >
                          <option value="all">{t('allCategories')}</option>
                          {AUCTION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>{t('priceRange')}</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="number" placeholder={t('min')} value={minPrice} onChange={e => setMinPrice(e.target.value)}
                            style={{ width: '80px', padding: '0.65rem', borderRadius: '0.5rem', background: isDark ? '#1f2937' : '#f3f4f6', border: isDark ? '1px solid #374151' : '1px solid #d1d5db', color: isDark ? 'white' : 'black', outline: 'none' }} />
                          <span style={{ color: '#6b7280' }}>–</span>
                          <input type="number" placeholder={t('max')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                            style={{ width: '80px', padding: '0.65rem', borderRadius: '0.5rem', background: isDark ? '#1f2937' : '#f3f4f6', border: isDark ? '1px solid #374151' : '1px solid #d1d5db', color: isDark ? 'white' : 'black', outline: 'none' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>{t('endsIn')}</label>
                        <select
                          value={timeRemaining}
                          onChange={e => setTimeRemaining(e.target.value as any)}
                          style={{ padding: '0.65rem', borderRadius: '0.5rem', background: isDark ? '#1f2937' : '#f3f4f6', border: isDark ? '1px solid #374151' : '1px solid #d1d5db', color: isDark ? 'white' : 'black', outline: 'none' }}
                        >
                          <option value="all">{t('anyTime')}</option>
                          <option value="24_hours">{t('lessThan24Hours')}</option>
                          <option value="7_days">{t('lessThan7Days')}</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={resetFilters}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          background: 'transparent', border: 'none', color: '#f87171',
                          fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                          padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <RefreshCw style={{ width: '1rem', height: '1rem' }} /> {t('resetFilters')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Trending Section ── */}
          {trendingAuctions.length > 0 && filterCategory === 'all' && !searchQuery && (
            <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Flame style={{ width: '1.5rem', height: '1.5rem', color: '#ef4444' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: isDark ? '#f3f4f6' : '#111827' }}>
                  {t('trendingNow')}
                </h2>
                <span className="badge-urgent" style={{ marginLeft: 'auto', animation: 'none' }}>{t('endingSoon')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.75rem' }}>
                {trendingAuctions.map(auction => (
                  <motion.div key={auction.id} whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                    <AuctionCard auction={auction} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── All Auctions ── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: isDark ? '#e5e7eb' : '#111827' }}>
                {filterCategory !== 'all' ? filterCategory : t('allLiveAuctions')}
              </h2>
              {filteredAndSortedAuctions.length > 0 && (
                <span style={{
                  background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '9999px', padding: '0.15rem 0.6rem',
                  fontSize: '0.75rem', fontWeight: 700,
                }}>
                  {filteredAndSortedAuctions.length}
                </span>
              )}
            </div>

            {filteredAndSortedAuctions.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.75rem' }}>
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
                style={{
                  padding: '4rem 2rem', textAlign: 'center',
                  border: '1px dashed rgba(75,85,99,0.5)',
                  borderRadius: '1.25rem',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>{t('noAuctionsMatch')}</p>
                <button
                  onClick={resetFilters}
                  style={{
                    marginTop: '1rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                    color: '#818cf8', borderRadius: '0.75rem', padding: '0.5rem 1.25rem',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  }}
                >
                  {t('resetFilters')}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      ) : (
        /* ── Empty State ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{ borderRadius: '1.5rem', padding: '5rem 2rem', textAlign: 'center', maxWidth: '40rem', margin: '0 auto' }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>🎨</div>
          <h3 style={{ color: isDark ? '#e5e7eb' : '#111827', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {t('noActiveAuctions')}
          </h3>
          <p style={{ color: isDark ? '#6b7280' : '#4b5563', fontSize: '1rem' }}>
            {t('galleryEmpty')}
          </p>
        </motion.div>
      )}
    </div>
  );
};

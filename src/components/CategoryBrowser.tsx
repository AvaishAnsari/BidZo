import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const CATEGORIES_WITH_META = [
  { key: 'all',          label: 'All',          emoji: '✨', color: '#818cf8' },
  { key: 'Watches',      label: 'Watches',       emoji: '⌚', color: '#fbbf24' },
  { key: 'Art',          label: 'Art',           emoji: '🎨', color: '#f87171' },
  { key: 'Jewellery',    label: 'Jewellery',     emoji: '💎', color: '#c084fc' },
  { key: 'Antiques',     label: 'Antiques',      emoji: '🏺', color: '#34d399' },
  { key: 'Electronics',  label: 'Electronics',   emoji: '📱', color: '#60a5fa' },
  { key: 'Vehicles',     label: 'Vehicles',      emoji: '🚗', color: '#f97316' },
  { key: 'Collectibles', label: 'Collectibles',  emoji: '🪄', color: '#e879f9' },
  { key: 'Books',        label: 'Books',         emoji: '📚', color: '#a3e635' },
  { key: 'Fashion',      label: 'Fashion',       emoji: '👗', color: '#fb7185' },
  { key: 'Sports',       label: 'Sports',        emoji: '⚽', color: '#4ade80' },
  { key: 'Real Estate',  label: 'Real Estate',   emoji: '🏠', color: '#38bdf8' },
];

interface Props {
  selected: string;
  onChange: (key: string) => void;
  counts?: Record<string, number>;
}

export default function CategoryBrowser({ selected, onChange, counts = {} }: Props) {
  const { isDark } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '2rem' }}>
      {/* Left arrow */}
      {showLeft && (
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => scroll('left')}
          style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: isDark ? 'rgba(15,12,40,0.95)' : 'white',
            border: '1px solid rgba(99,102,241,0.3)', borderRadius: '50%',
            width: '2rem', height: '2rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            color: '#818cf8',
          }}
        >
          <ChevronLeft size={16} />
        </motion.button>
      )}

      {/* Right arrow */}
      {showRight && (
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => scroll('right')}
          style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 10, background: isDark ? 'rgba(15,12,40,0.95)' : 'white',
            border: '1px solid rgba(99,102,241,0.3)', borderRadius: '50%',
            width: '2rem', height: '2rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            color: '#818cf8',
          }}
        >
          <ChevronRight size={16} />
        </motion.button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: '0.65rem',
          overflowX: 'auto',
          padding: '0.5rem 2.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {CATEGORIES_WITH_META.map((cat) => {
          const isActive = selected === cat.key;
          const count = cat.key === 'all' ? undefined : counts[cat.key];
          return (
            <motion.button
              key={cat.key}
              onClick={() => onChange(cat.key)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.65rem 1rem',
                borderRadius: '1rem',
                border: isActive
                  ? `1px solid ${cat.color}55`
                  : `1px solid ${isDark ? 'rgba(55,65,81,0.5)' : 'rgba(209,213,219,0.8)'}`,
                background: isActive
                  ? `linear-gradient(135deg, ${cat.color}22, ${cat.color}11)`
                  : isDark ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: '5rem',
                position: 'relative',
                backdropFilter: 'blur(10px)',
                boxShadow: isActive
                  ? `0 0 20px ${cat.color}33, 0 4px 12px rgba(0,0,0,0.2)`
                  : '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{cat.emoji}</span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: isActive ? cat.color : isDark ? '#9ca3af' : '#4b5563',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>
                {cat.label}
              </span>
              {count !== undefined && count > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-0.4rem',
                  right: '-0.4rem',
                  background: isActive ? cat.color : '#6366f1',
                  color: 'white',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  width: '1.2rem',
                  height: '1.2rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {count > 9 ? '9+' : count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="category-indicator"
                  style={{
                    position: 'absolute',
                    bottom: '0.3rem',
                    width: '1.5rem',
                    height: '2px',
                    borderRadius: '9999px',
                    background: cat.color,
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* fade edges */}
      <div style={{
        position: 'absolute', left: '2.5rem', top: 0, bottom: 0, width: '2rem', pointerEvents: 'none',
        background: isDark
          ? 'linear-gradient(to right, rgba(2,6,23,0.9), transparent)'
          : 'linear-gradient(to right, rgba(255,255,255,0.9), transparent)',
        zIndex: 5,
      }} />
      <div style={{
        position: 'absolute', right: '2.5rem', top: 0, bottom: 0, width: '2rem', pointerEvents: 'none',
        background: isDark
          ? 'linear-gradient(to left, rgba(2,6,23,0.9), transparent)'
          : 'linear-gradient(to left, rgba(255,255,255,0.9), transparent)',
        zIndex: 5,
      }} />
    </div>
  );
}

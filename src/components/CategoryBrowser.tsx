import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AUCTION_CATEGORIES } from '../constants/auctionCategories';

const categoryIcons = ['💎', '🫧', '🧵', '🪡', '📖', '🎨', '🏺', '✨'];
const CATEGORIES_WITH_META = [
  { key: 'all', label: 'All', emoji: '✨', color: '#e2c17f' },
  ...AUCTION_CATEGORIES.map((label, index) => ({
    key: label,
    label,
    emoji: categoryIcons[index],
    color: ['#d4aa5f', '#60a5fa', '#f87171', '#34d399', '#a78bfa', '#fb7185', '#f97316', '#9ca3af'][index],
  })),
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
            border: '1px solid rgba(157,108,48,0.3)', borderRadius: '50%',
            width: '2rem', height: '2rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            color: '#e2c17f',
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
            border: '1px solid rgba(157,108,48,0.3)', borderRadius: '50%',
            width: '2rem', height: '2rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            color: '#e2c17f',
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
                width: '8.5rem',
                minHeight: '4.2rem',
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
                whiteSpace: 'normal',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {cat.label}
              </span>
              {count !== undefined && count > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-0.4rem',
                  right: '-0.4rem',
                  background: isActive ? cat.color : '#8b5e2c',
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

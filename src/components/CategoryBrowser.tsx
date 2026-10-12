import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Laptop, Shirt, Gem, Car, Watch, Palette, Book, Home, Diamond, Map, Trophy } from 'lucide-react';

export const CATEGORIES_WITH_META = [
  { key: 'all',          label: 'All', icon: <LayoutGrid className="w-6 h-6 text-[var(--text-main)]" /> },
  { key: 'Electronics',  label: 'Electronics', icon: <Laptop className="w-6 h-6 text-[var(--primary)]" /> },
  { key: 'Fashion',      label: 'Fashion', icon: <Shirt className="w-6 h-6 text-[#ec4899]" /> },
  { key: 'Collectibles', label: 'Collectibles', icon: <Gem className="w-6 h-6 text-[var(--warning)]" /> },
  { key: 'Vehicles',     label: 'Vehicles', icon: <Car className="w-6 h-6 text-[var(--danger)]" /> },
  { key: 'Watches',      label: 'Watches', icon: <Watch className="w-6 h-6 text-[#06b6d4]" /> },
  { key: 'Jewelry',      label: 'Jewelry', icon: <Diamond className="w-6 h-6 text-[#10b981]" /> },
  { key: 'Art',          label: 'Art', icon: <Palette className="w-6 h-6 text-[#f59e0b]" /> },
  { key: 'Antiques',     label: 'Antiques', icon: <Map className="w-6 h-6 text-[#8b5cf6]" /> },
  { key: 'Books',        label: 'Books', icon: <Book className="w-6 h-6 text-[#a855f7]" /> },
  { key: 'Sports',       label: 'Sports', icon: <Trophy className="w-6 h-6 text-[#ef4444]" /> },
  { key: 'Real Estate',  label: 'Real Estate', icon: <Home className="w-6 h-6 text-[#3b82f6]" /> },
];

interface Props {
  selected: string;
  onChange: (key: string) => void;
  counts?: Record<string, number>;
}

export default function CategoryBrowser({ selected, onChange, counts = {} }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    handleScroll();
  }, []);

  return (
    <div className="relative mb-6 group">
      {/* Left arrow */}
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] shadow-md hover:bg-[var(--elevated)] transition-all -ml-5"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Right arrow */}
      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] shadow-md hover:bg-[var(--elevated)] transition-all -mr-5"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex items-center gap-3 overflow-x-auto py-4 px-1 no-scrollbar"
      >
        {CATEGORIES_WITH_META.map((cat) => {
          const isActive = selected === cat.key;
          const count = cat.key === 'all' ? undefined : counts[cat.key];
          return (
            <button
              key={cat.key}
              onClick={() => onChange(cat.key)}
              className={`relative shrink-0 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all w-[100px] h-[85px] rounded-2xl shadow-sm border ${
                isActive
                  ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                  : 'bg-[var(--elevated)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-main)] hover:shadow-md hover:-translate-y-1'
              }`}
            >
              <div className="flex items-center justify-center h-8">
                {cat.icon}
              </div>
              <span className={`text-xs font-bold ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>
                {cat.label}
              </span>
              {count !== undefined && count > 0 && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.5 rounded-full text-[var(--text-muted)]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

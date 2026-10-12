import React from 'react';
import { Star, StarHalf } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface RatingBadgeProps {
  score: number;
  totalReviews: number;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ score, totalReviews }) => {
  const { isDark } = useTheme();
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 !== 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ display: 'flex', color: isDark ? '#fbbf24' : '#b45309' }}>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} style={{ width: '1.2rem', height: '1.2rem', fill: 'currentColor' }} />;
          }
          if (i === fullStars && hasHalfStar) {
            return <StarHalf key={i} style={{ width: '1.2rem', height: '1.2rem', fill: 'currentColor' }} />;
          }
          return <Star key={i} style={{ width: '1.2rem', height: '1.2rem', opacity: isDark ? 0.3 : 1, color: isDark ? undefined : '#cbd5e1' }} />;
        })}
      </div>
      <span style={{ color: isDark ? '#e5e7eb' : '#1f2937', fontWeight: 700, fontSize: '0.9rem' }}>
        {score.toFixed(1)}
      </span>
      <span style={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: '0.8rem' }}>
        ({totalReviews} reviews)
      </span>
    </div>
  );
};

import React from 'react';
import { Star, StarHalf } from 'lucide-react';

interface RatingBadgeProps {
  score: number;
  totalReviews: number;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ score, totalReviews }) => {
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 !== 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ display: 'flex', color: '#fbbf24' }}>
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} style={{ width: '1.2rem', height: '1.2rem', fill: 'currentColor' }} />;
          }
          if (i === fullStars && hasHalfStar) {
            return <StarHalf key={i} style={{ width: '1.2rem', height: '1.2rem', fill: 'currentColor' }} />;
          }
          return <Star key={i} style={{ width: '1.2rem', height: '1.2rem', opacity: 0.3 }} />;
        })}
      </div>
      <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '0.9rem' }}>
        {score.toFixed(1)}
      </span>
      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
        ({totalReviews} reviews)
      </span>
    </div>
  );
};

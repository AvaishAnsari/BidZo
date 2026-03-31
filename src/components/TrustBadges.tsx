import React from 'react';
import { ShieldCheck, Star } from 'lucide-react';

/**
 * Generates a stable pseudo-random integer from a UUID string.
 * @param uuid A user ID (typically UUID format)
 * @param min Minimum return value 
 * @param max Maximum return value
 * @returns A consistent integer between min and max inclusive
 */
const getDeterministicHash = (uuid: string, min: number, max: number): number => {
  if (!uuid) return min;
  // Strip hyphens and take first 8 hex characters
  const hexSt = uuid.replace(/-/g, '').substring(0, 8);
  const intVal = parseInt(hexSt, 16) || 0;
  return min + (intVal % (max - min + 1));
};

interface VerifiedBadgeProps {
  userId: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a "Verified Seller" badge consistently based on the user's ID.
 * To provide a premium feel, 80% of active sellers are "verified".
 */
export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ userId, className, style }) => {
  if (!userId) return null;
  // 0-9 scale. Let's make 80% of sellers verified for demo purposes.
  const isVerified = getDeterministicHash(userId, 0, 9) > 1;

  if (!isVerified) return null;

  return (
    <div 
      className={`verified-badge ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
        borderRadius: '50%',
        padding: '2px',
        boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
        ...style
      }}
      title="Verified Premium Seller"
    >
      <ShieldCheck style={{ width: '14px', height: '14px', color: '#ffffff' }} />
    </div>
  );
};

interface SellerRatingProps {
  userId: string;
  showCount?: boolean;
  className?: string;
}

/**
 * Renders a deterministic 5-star rating (e.g. 4.8) and review count for a user ID.
 */
export const SellerRating: React.FC<SellerRatingProps> = ({ userId, showCount = true, className }) => {
  if (!userId) return null;

  // Generate a stable rating between 4.4 and 5.0
  const baseRating = getDeterministicHash(userId, 44, 50) / 10;
  // Generate a stable review count between 12 and 845
  const reviewCount = getDeterministicHash(userId, 12, 845);

  return (
    <div 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#fcd34d' // amber-300
      }}
    >
      <Star style={{ width: '12px', height: '12px', fill: 'currentColor' }} />
      <span>{baseRating.toFixed(1)}</span>
      {showCount && (
        <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: '2px' }}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { calculateSmartBids } from '../utils/aiBidding';
import { formatCurrency } from '../utils/format';
import { motion } from 'framer-motion';

interface SmartBidAssistantProps {
  currentPrice: number;
  minIncrement: number;
  timeRemainingMs: number;
  bidCount: number;
  onSelectBid: (amount: number) => void;
}

export const SmartBidAssistant: React.FC<SmartBidAssistantProps> = ({
  currentPrice,
  minIncrement,
  timeRemainingMs,
  bidCount,
  onSelectBid
}) => {
  const suggestions = calculateSmartBids(currentPrice, minIncrement, timeRemainingMs, bidCount);

  return (
    <div style={{
      width: '100%',
      background: 'rgba(99, 102, 241, 0.05)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '1rem',
      padding: '1.25rem',
      marginTop: '1.5rem',
      marginBottom: '1rem',
      boxShadow: 'inset 0 0 20px rgba(99, 102, 241, 0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          padding: '0.35rem',
          borderRadius: '0.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Sparkles style={{ width: '1rem', height: '1rem', color: '#ffffff' }} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#e0e7ff', letterSpacing: '0.05em' }}>
            AI Smart Bidding
          </h4>
          <p style={{ margin: 0, fontSize: '0.7rem', color: '#818cf8' }}>Algorithmically generated optimal bids</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {suggestions.map((sug, idx) => {
          let badgeColor = '';
          let glowColor = '';
          if (sug.type === 'Conservative') {
            badgeColor = 'rgba(75, 85, 99, 0.4)';
            glowColor = 'rgba(156, 163, 175, 0.2)';
          } else if (sug.type === 'Optimal') {
            badgeColor = 'rgba(99, 102, 241, 0.25)';
            glowColor = 'rgba(129, 140, 248, 0.5)';
          } else {
            badgeColor = 'rgba(239, 68, 68, 0.15)';
            glowColor = 'rgba(248, 113, 113, 0.4)';
          }

          return (
            <motion.button
              key={sug.type}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={(e) => { e.preventDefault(); onSelectBid(sug.amount); }}
              title={sug.rationale}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: badgeColor,
                border: `1px solid ${glowColor}`,
                borderRadius: '0.75rem',
                padding: '0.75rem 0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '0.7rem', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                {sug.type}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  {formatCurrency(sug.amount)}
                </span>
              </div>
              <div style={{
                marginTop: '0.4rem', fontSize: '0.65rem', fontWeight: 600,
                color: sug.type === 'Knockout' ? '#fca5a5' : sug.type === 'Optimal' ? '#a5b4fc' : '#9ca3af',
                display: 'flex', alignItems: 'center', gap: '0.2rem',
                background: 'rgba(0,0,0,0.2)', padding: '0.15rem 0.4rem', borderRadius: '1rem'
              }}>
                <ArrowUpRight style={{ width: '0.6rem', height: '0.6rem' }} /> {sug.probability}% Win Prob
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Clock, X } from 'lucide-react';
import { fetchAllBids } from '../services/auctionService';
import type { BidRecord } from '../services/auctionService';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, maskEmail, timeAgo } from '../utils/format';

interface BidHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  auctionId: string;
  currentUserEmail?: string;
}

export const BidHistoryModal: React.FC<BidHistoryModalProps> = ({ isOpen, onClose, auctionId, currentUserEmail }) => {
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchBidsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetches directly from your custom Django REST API
        const data = await fetchAllBids(auctionId);
        if (isMounted) setBids(data);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load bid history');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBidsData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, auctionId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '600px',
            maxHeight: '85vh',
            borderRadius: '1.25rem',
            background: isDark ? '#1f2937' : '#ffffff',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: isDark ? '1px solid rgba(55,65,81,0.5)' : '1px solid rgba(209,213,219,0.8)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: isDark ? 'rgba(17,24,39,0.5)' : '#ffffff'
          }}>
            <h2 style={{ color: isDark ? 'white' : '#111827', margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock style={{ width: '1.25rem', height: '1.25rem', color: '#818cf8' }} />
              Full Bid History
              {bids.length > 0 && !isLoading && (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600,
                  background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                  padding: '0.15rem 0.5rem', borderRadius: '9999px',
                  marginLeft: '0.5rem'
                }}>
                  {bids.length} Total
                </span>
              )}
            </h2>
            <button 
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: isDark ? '#9ca3af' : '#6b7280',
                cursor: 'pointer', padding: '0.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0.375rem', transition: 'all 0.2s'
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ 
            padding: '1.5rem', 
            overflowY: 'auto',
            flex: 1,
            display: 'flex', flexDirection: 'column', gap: '0.75rem'
          }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
                <Loader2 style={{ width: '2rem', height: '2rem', color: '#818cf8', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Loading bid history...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#f87171' }}>
                <p>{error}</p>
                <button 
                  onClick={() => onClose()}
                  style={{ marginTop: '1rem', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            ) : bids.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>No bids have been placed yet.</p>
              </div>
            ) : (
              bids.map((bid, i) => {
                const isMe = currentUserEmail === bid.user_email;
                const isHighest = i === 0;
                
                return (
                  <motion.div
                    key={bid.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    style={{
                      display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto',
                      alignItems: 'center', gap: '1rem',
                      padding: '1rem',
                      background: isHighest 
                        ? (isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.1)')
                        : (isDark ? 'rgba(17,24,39,0.5)' : '#f9fafb'),
                      borderRadius: '0.75rem',
                      border: isHighest 
                        ? '1px solid rgba(99,102,241,0.3)'
                        : (isDark ? '1px solid rgba(55,65,81,0.4)' : '1px solid rgba(209,213,219,0.8)'),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                      <div style={{ color: isDark ? '#e5e7eb' : '#111827', fontWeight: 600 }}>
                        {isMe ? 'You' : maskEmail(bid.user_email)}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        {timeAgo(bid.created_at)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#34d399' }}>
                      {formatCurrency(bid.amount)}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

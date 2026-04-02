import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Trophy, Clock, Copy } from 'lucide-react';
import { fetchAllBids } from '../services/auctionService';
import type { BidRecord } from '../services/auctionService';
import { isSupabaseConfigured } from '../utils/supabase';
import { getBidsForAuction } from '../utils/localStore';
import { formatCurrency, maskEmail, timeAgo } from '../utils/format';
import { generateMockTxHash, shortenTxHash, copyToClipboard } from '../utils/blockchain';

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

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchBidsData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!isSupabaseConfigured()) {
          const localBids = getBidsForAuction(auctionId);
          // Sort descending if local bids aren't
          const mappedBids = localBids.map(b => ({
            id: b.id,
            amount: b.amount,
            created_at: b.placedAt,
            user_email: b.bidderEmail,
          })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          if (isMounted) setBids(mappedBids);
        } else {
          const data = await fetchAllBids(auctionId);
          if (isMounted) setBids(data);
        }
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
          background: 'rgba(0,0,0,0.7)',
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
          className="glass-card"
          style={{
            width: '100%', maxWidth: '600px',
            maxHeight: '85vh',
            borderRadius: '1.25rem',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(55,65,81,0.5)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(17,24,39,0.5)'
          }}>
            <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                background: 'none', border: 'none', color: '#9ca3af',
                cursor: 'pointer', padding: '0.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0.375rem', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none'; }}
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
                        ? (isMe ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.08)')
                        : 'rgba(17,24,39,0.5)',
                      borderRadius: '0.75rem',
                      border: isHighest 
                        ? (isMe ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(99,102,241,0.3)')
                        : '1px solid rgba(55,65,81,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                      <div style={{
                        width: '2rem', height: '2rem', flexShrink: 0,
                        borderRadius: '50%',
                        background: isHighest 
                          ? (isMe ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)')
                          : 'rgba(55,65,81,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isHighest 
                          ? (isMe ? '#4ade80' : '#a5b4fc')
                          : '#9ca3af',
                      }}>
                        {isHighest ? <Trophy style={{ width: '1rem', height: '1rem' }} /> : `#${i + 1}`}
                      </div>
                      
                      <div style={{ minWidth: 0 }}>
                        <div style={{ 
                          color: isHighest ? (isMe ? '#4ade80' : '#c4b5fd') : '#d1d5db',
                          fontWeight: isHighest ? 700 : 500, fontSize: '0.95rem',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {isMe ? 'You' : maskEmail(bid.user_email)}
                          {isHighest && (
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 800,
                              color: isMe ? '#4ade80' : '#a5b4fc',
                              background: isMe ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.15)',
                              border: `1px solid ${isMe ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
                              borderRadius: '9999px', padding: '0.1rem 0.5rem',
                            }}>
                              TOP BID
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span>{timeAgo(bid.created_at)}</span>
                          <span style={{ color: '#374151' }}>•</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(generateMockTxHash(bid.id), 'Transaction Hash'); }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                              background: isHighest ? 'rgba(52, 211, 153, 0.08)' : 'rgba(55, 65, 81, 0.2)',
                              border: isHighest ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(75, 85, 99, 0.2)',
                              color: isHighest ? '#10b981' : '#9ca3af',
                              padding: '0.15rem 0.4rem', borderRadius: '0.25rem',
                              cursor: 'pointer', fontSize: '0.7rem',
                              fontFamily: 'monospace'
                            }}
                            title="Copy Tx Hash"
                          >
                            <Copy style={{ width: '0.6rem', height: '0.6rem' }} />
                            {shortenTxHash(generateMockTxHash(bid.id))}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        color: isHighest ? (isMe ? '#4ade80' : '#a5b4fc') : '#e5e7eb',
                        fontWeight: 800, fontSize: '1.25rem',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatCurrency(bid.amount)}
                      </span>
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

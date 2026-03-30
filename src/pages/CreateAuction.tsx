import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { createAuction as localCreateAuction } from '../utils/localStore';
import { Loader2, Sparkles, Link as LinkIcon, AlertCircle, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const inputClass = `block w-full rounded-xl border border-gray-700 bg-gray-900/50 py-3 px-4
  text-white placeholder-gray-500 focus:outline-none focus:ring-2
  focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm shadow-inner`;

export const CreateAuction = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title:        '',
    description:  '',
    imageUrl:     '',
    startPrice:   '',
    minIncrement: '',
    endTime:      '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Security: only sellers can reach this page ──────────────────────────
  if (userRole !== 'seller') {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem',
      }}>
        <AlertCircle style={{ width: '3rem', height: '3rem', color: '#f87171' }} />
        <h2 style={{ color: '#f87171', fontWeight: 700, fontSize: '1.25rem' }}>
          Access Restricted
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Only Sellers can create auctions.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: '0.75rem', color: '#a5b4fc', padding: '0.65rem 1.5rem',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          ← Back to Auctions
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const startPrice   = parseFloat(formData.startPrice);
    const minIncrement = parseFloat(formData.minIncrement);
    const endTime      = new Date(formData.endTime);

    if (startPrice <= 0 || minIncrement <= 0) {
      toast.error('Price and increment must be greater than 0');
      return;
    }

    if (endTime <= new Date()) {
      toast.error('End time must be in the future');
      return;
    }

    if (!formData.imageUrl.trim()) {
      toast.error('Please provide an image URL');
      return;
    }

    setIsSubmitting(true);
    try {
      // ── Offline mode ────────────────────────────────────────────────────
      if (!isSupabaseConfigured()) {
        localCreateAuction({
          title:        formData.title.trim(),
          description:  formData.description.trim(),
          imageUrl:     formData.imageUrl.trim(),
          startPrice,
          minIncrement,
          endTime:      endTime.toISOString(),
          sellerId:     user.id,
        });
        toast.success('Auction created! 🎉');
        navigate('/');
        return;
      }

      // ── Supabase mode ────────────────────────────────────────────────────
      const { error: dbError } = await supabase.from('auctions').insert({
        title:         formData.title.trim(),
        description:   formData.description.trim(),
        image_url:     formData.imageUrl.trim(),
        start_price:   startPrice,
        current_price: startPrice,
        min_increment: minIncrement,
        start_time:    new Date().toISOString(),
        end_time:      endTime.toISOString(),
        seller_id:     user.id,
        status:        'live',
      });

      if (dbError) throw dbError;

      toast.success('Auction created successfully! 🎉');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create auction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10 w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-80 bg-brand-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-3xl overflow-hidden relative"
      >
        <div className="px-6 py-10 sm:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="bg-brand-500/10 p-3 rounded-2xl mb-4 inline-block border border-brand-500/20">
              <Sparkles className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">Create New Auction</h2>
            <p className="mt-2 text-gray-400">List an exclusive item for bidding</p>

            {/* Seller badge */}
            <div style={{
              marginTop: '0.85rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.9rem',
              borderRadius: '9999px',
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.25)',
              fontSize: '0.72rem', fontWeight: 700, color: '#d8b4fe',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              🏷️ Seller — Create listing
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-brand-400" />
                </div>
                <input
                  type="url"
                  name="imageUrl"
                  id="imageUrl"
                  required
                  value={formData.imageUrl}
                  onChange={handleChange}
                  className={`${inputClass} pl-10`}
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
              {/* Live preview */}
              {formData.imageUrl && (
                <div style={{ marginTop: '0.75rem', borderRadius: '0.75rem', overflow: 'hidden', maxHeight: '200px' }}>
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <p className="mt-1.5 text-xs text-gray-500">
                Paste any public image URL — Unsplash, Pexels, or your own hosted image.
              </p>
            </div>

            {/* Title & Description */}
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="e.g. Vintage Rolex Submariner 1965"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  value={formData.description}
                  onChange={handleChange}
                  className={`${inputClass} resize-none`}
                  placeholder="Detailed description of the item — provenance, condition, certificates..."
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              <div>
                <label htmlFor="startPrice" className="block text-sm font-medium text-gray-300 mb-2">
                  Starting Price (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-brand-400" />
                  </div>
                  <input
                    type="number"
                    name="startPrice"
                    id="startPrice"
                    required
                    min="1"
                    step="1"
                    value={formData.startPrice}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="minIncrement" className="block text-sm font-medium text-gray-300 mb-2">
                  Min Bid Increment (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-brand-400" />
                  </div>
                  <input
                    type="number"
                    name="minIncrement"
                    id="minIncrement"
                    required
                    min="1"
                    step="1"
                    value={formData.minIncrement}
                    onChange={handleChange}
                    className={`${inputClass} pl-10`}
                    placeholder="500"
                  />
                </div>
              </div>
            </div>

            {/* Timing */}
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-300 mb-2">
                Auction End Time
              </label>
              <input
                type="datetime-local"
                name="endTime"
                id="endTime"
                required
                value={formData.endTime}
                onChange={handleChange}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] border-t border-brand-400/30"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin h-5 w-5" /> Creating Auction...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Create Auction</>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

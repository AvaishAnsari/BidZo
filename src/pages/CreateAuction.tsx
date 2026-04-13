import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { createAuction as localCreateAuction } from '../utils/localStore';
import { Loader2, Sparkles, Link as LinkIcon, AlertCircle, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const inputClass = `block w-full rounded-xl border border-gray-700 bg-gray-900/50 py-3 px-4
  text-white placeholder-gray-500 focus:outline-none focus:ring-2
  focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm shadow-inner`;

const auctionSchema = z.object({
  imageUrl: z.string().url("Please drop a valid public image URL."),
  title: z.string().min(5, "Title must be at least 5 characters long.").max(100, "Title is too long"),
  description: z.string().min(10, "Description needs to be more detailed (min 10 chars)."),
  startPrice: z.string().min(1, "Starting price must be greater than 0"),
  minIncrement: z.string().min(1, "Minimum increment must be greater than 0"),
  endTime: z.string().refine((val) => new Date(val) > new Date(), {
    message: "End time must be in the future."
  })
});

type AuctionFormValues = z.infer<typeof auctionSchema>;

export const CreateAuction = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<AuctionFormValues>({
    resolver: zodResolver(auctionSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      startPrice: '',
      minIncrement: '',
      endTime: '',
    }
  });

  const watchImageUrl = watch("imageUrl");

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

  const onAuctionSubmit = async (data: AuctionFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // ── Offline mode ────────────────────────────────────────────────────
      if (!isSupabaseConfigured()) {
        localCreateAuction({
          title:        data.title.trim(),
          description:  data.description.trim(),
          imageUrl:     data.imageUrl.trim(),
          startPrice:   parseFloat(data.startPrice),
          minIncrement: parseFloat(data.minIncrement),
          endTime:      new Date(data.endTime).toISOString(),
          sellerId:     user.id,
        });
        toast.success('Auction created! 🎉');
        navigate('/');
        return;
      }

      // ── Supabase mode ────────────────────────────────────────────────────
      const { error: dbError } = await supabase.from('auctions').insert({
        title:         data.title.trim(),
        description:   data.description.trim(),
        image_url:     data.imageUrl.trim(),
        start_price:   parseFloat(data.startPrice),
        current_price: parseFloat(data.startPrice),
        min_increment: parseFloat(data.minIncrement),
        start_time:    new Date().toISOString(),
        end_time:      new Date(data.endTime).toISOString(),
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

          <form onSubmit={handleSubmit(onAuctionSubmit)} className="space-y-8">
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
                  {...register("imageUrl")}
                  className={`${inputClass} pl-10 ${errors.imageUrl ? 'border-red-500' : ''}`}
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
              {errors.imageUrl && <p className="mt-1 text-sm text-red-500">{errors.imageUrl.message}</p>}
              
              {/* Live preview */}
              {watchImageUrl && !errors.imageUrl && (
                <div style={{ marginTop: '0.75rem', borderRadius: '0.75rem', overflow: 'hidden', maxHeight: '200px' }}>
                  <img
                    src={watchImageUrl}
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
                  {...register("title")}
                  className={`${inputClass} ${errors.title ? 'border-red-500' : ''}`}
                  placeholder="e.g. Vintage Rolex Submariner 1965"
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  {...register("description")}
                  className={`${inputClass} resize-none ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Detailed description of the item — provenance, condition, certificates..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>}
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
                    min="1"
                    step="1"
                    {...register("startPrice")}
                    className={`${inputClass} pl-10 ${errors.startPrice ? 'border-red-500' : ''}`}
                    placeholder="5000"
                  />
                </div>
                {errors.startPrice && <p className="mt-1 text-sm text-red-500">{errors.startPrice.message}</p>}
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
                    min="1"
                    step="1"
                    {...register("minIncrement")}
                    className={`${inputClass} pl-10 ${errors.minIncrement ? 'border-red-500' : ''}`}
                    placeholder="500"
                  />
                </div>
                {errors.minIncrement && <p className="mt-1 text-sm text-red-500">{errors.minIncrement.message}</p>}
              </div>
            </div>

            {/* Timing */}
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-300 mb-2">
                Auction End Time
              </label>
              <input
                type="datetime-local"
                {...register("endTime")}
                className={`${inputClass} [color-scheme:dark] ${errors.endTime ? 'border-red-500' : ''}`}
              />
              {errors.endTime && <p className="mt-1 text-sm text-red-500">{errors.endTime.message}</p>}
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

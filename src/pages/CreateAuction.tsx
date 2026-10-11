import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { createAuctionAPI, uploadAuctionImages } from '../services/auctionService';
import {
  Loader2,
  Sparkles,
  IndianRupee,
  AlertCircle,
  UploadCloud,
  Trash2,
  Star,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const auctionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long.").max(100, "Title is too long"),
  description: z.string().min(10, "Description needs to be more detailed (min 10 chars)."),
  startPrice: z.string().min(1, "Starting price must be greater than 0"),
  minIncrement: z.string().min(1, "Minimum increment must be greater than 0"),
  endTime: z.string().refine((val) => new Date(val) > new Date(), {
    message: "End time must be in the future."
  }),
  category: z.string().min(1, "Please select a category")
});

export const AUCTION_CATEGORIES = ['Art', 'Vehicles', 'Jewelry', 'Electronics', 'Antiques', 'Fashion', 'Sports', 'Other'];

type AuctionFormValues = z.infer<typeof auctionSchema>;

export const CreateAuction = () => {
  const { user, role, updateRole } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUpgradingRole, setIsUpgradingRole] = useState(false);

  // Multi-image upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync previews with object URLs & cleanup on unmount/change
  useEffect(() => {
    const urls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AuctionFormValues>({
    resolver: zodResolver(auctionSchema),
    defaultValues: {
      title: '',
      description: '',
      startPrice: '',
      minIncrement: '',
      endTime: '',
      category: 'Other',
    }
  });

  // ── Handle file selection / drop ──────────────────────────────────────
  const handleFilesAdded = (incomingFiles: FileList | File[]) => {
    setImageError(null);
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    const addedList: File[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      const isImage = validExtensions.includes(file.type.toLowerCase()) ||
                      file.name.match(/\.(jpe?g|png|webp|gif|avif)$/i);

      if (!isImage) {
        toast.error(`"${file.name}" is not a supported image format.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 10MB size limit.`);
        continue;
      }

      // Avoid duplicates with identical name and size
      const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        addedList.push(file);
      }
    }

    if (addedList.length > 0) {
      setSelectedFiles(prev => [...prev, ...addedList]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedFiles(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (updated.length === 0) {
        setImageError("At least 1 image is required for the auction.");
      }
      return updated;
    });
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setSelectedFiles(prev => {
      const updated = [...prev];
      const [chosen] = updated.splice(index, 1);
      updated.unshift(chosen);
      return updated;
    });
    toast.success("Cover photo updated!");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Role gate: Guide buyers to activate seller mode with 1 click ──
  if (role !== 'seller') {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 sm:p-10 text-center border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-500/20 blur-[80px] rounded-full pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-6 text-brand-400 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Start Selling on BidZo
          </h2>

          <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-6">
            You are currently signed in as a <strong className="text-purple-300 font-bold uppercase tracking-wider">Buyer</strong>. Upgrade your account to <strong className="text-brand-300 font-bold uppercase tracking-wider">Seller</strong> with one click to list items, upload photography, and receive live bids!
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={async () => {
                setIsUpgradingRole(true);
                try {
                  const res = await updateRole('seller');
                  if (!res.error) {
                    toast.success('Welcome to Seller Mode! You can now create your listing. 🎉');
                  } else {
                    toast.error(res.error || 'Failed to switch role.');
                  }
                } catch {
                  toast.error('Failed to update role. Please try again.');
                } finally {
                  setIsUpgradingRole(false);
                }
              }}
              disabled={isUpgradingRole}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isUpgradingRole ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Upgrading Account...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Activate Seller Mode & Continue</>
              )}
            </button>

            <button
              onClick={() => navigate('/auctions')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-sm border border-white/10 transition-colors cursor-pointer"
            >
              ← Back to Auctions
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const onAuctionSubmit = async (data: AuctionFormValues) => {
    if (!user) {
      toast.error('You must be logged in to create an auction.');
      navigate('/login');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Session expired. Please log in again to create an auction.');
      navigate('/login');
      return;
    }

    // Minimum 1 image validation
    if (selectedFiles.length === 0) {
      setImageError('Please upload at least 1 image for your auction.');
      toast.error('Minimum 1 image is required.');
      return;
    }

    setImageError(null);
    setIsSubmitting(true);
    setUploadStatus('Uploading auction photos...');

    try {
      // 1. Upload files to Django backend
      const uploadedUrls = await uploadAuctionImages(selectedFiles);
      if (!uploadedUrls || uploadedUrls.length === 0) {
        throw new Error('Image upload failed. Please try again.');
      }

      setUploadStatus('Creating auction listing...');

      // 2. Create the auction listing
      await createAuctionAPI({
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        image_url: uploadedUrls[0], // primary cover
        images: uploadedUrls,       // all photos
        starting_price: parseFloat(data.startPrice),
        end_time: new Date(data.endTime).toISOString(),
      });

      toast.success('Auction created successfully! 🎉');
      navigate('/auctions');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create auction');
    } finally {
      setIsSubmitting(false);
      setUploadStatus(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10 w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-80 bg-brand-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl"
      >
        <div className="px-6 py-10 sm:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="bg-brand-500/10 p-3 rounded-2xl mb-4 inline-block border border-brand-500/20 shadow-inner">
              <Sparkles className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-white">Create Auction</h2>
            <p className="mt-2 text-gray-400">List an exclusive item with real item photography</p>

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
              🏷️ Seller — Verified Listing
            </div>
          </div>

          <form onSubmit={handleSubmit(onAuctionSubmit)} className="space-y-8">
            {/* Image Upload Zone */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-brand-400" />
                  Item Images
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    Min 1 required • Multiple supported
                  </span>
                </label>
                {selectedFiles.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'} selected
                  </span>
                )}
              </div>

              {/* Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesAdded(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-8 text-center flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-brand-400 bg-brand-500/15 shadow-[0_0_25px_rgba(99,102,241,0.25)]'
                    : imageError
                    ? 'border-red-500/80 bg-red-500/5'
                    : 'border-white/15 bg-black/40 hover:border-brand-500/50 hover:bg-white/[0.03]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesAdded(e.target.files);
                    }
                    e.target.value = '';
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 group-hover:text-brand-300 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    <span className="text-brand-400 hover:underline">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload 1 or more photos (JPG, PNG, WEBP, GIF up to 10MB each)
                  </p>
                </div>
              </div>

              {imageError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* Thumbnail Previews Grid */}
              <AnimatePresence>
                {selectedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Uploaded Images (First is cover photo):</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add more
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedFiles.map((file, idx) => (
                        <motion.div
                          key={`${file.name}-${file.size}-${idx}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`group relative rounded-xl overflow-hidden border bg-black/60 aspect-square shadow-md transition-all ${
                            idx === 0
                              ? 'border-brand-500 ring-2 ring-brand-500/30'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <img
                            src={previews[idx]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />

                          {/* Cover badge */}
                          {idx === 0 ? (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-600/90 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-md border border-brand-400/40">
                              <Star className="w-2.5 h-2.5 fill-current" /> Cover
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCover(idx)}
                              title="Set as cover image"
                              className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-medium text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-600 hover:text-white"
                            >
                              Make Cover
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            title="Remove image"
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-gray-300 hover:text-red-400 hover:bg-red-500/20 backdrop-blur-md transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Bottom info pill */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 text-[10px] text-gray-300 truncate">
                            <p className="truncate font-medium">{file.name}</p>
                            <p className="text-gray-400 text-[9px]">{formatFileSize(file.size)}</p>
                          </div>
                        </motion.div>
                      ))}

                      {/* Quick Add Card */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border border-dashed border-white/15 hover:border-brand-500/50 hover:bg-brand-500/5 bg-black/30 aspect-square flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-brand-400 transition-all cursor-pointer"
                      >
                        <Plus className="w-6 h-6" />
                        <span className="text-xs font-medium">Add Photo</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Title */}
            <div className="relative group">
              <input
                type="text"
                id="title"
                {...register("title")}
                className={`peer w-full bg-black/40 border border-white/10 rounded-xl h-[56px] px-4 pt-5 pb-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder-transparent shadow-inner ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Title"
              />
              <label 
                htmlFor="title" 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[14px] peer-focus:text-[10px] peer-focus:text-brand-400 font-medium uppercase tracking-wider"
              >
                Auction Title
              </label>
              {errors.title && <p className="mt-1.5 text-sm text-red-500">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="relative group">
              <textarea
                id="description"
                rows={4}
                {...register("description")}
                className={`peer w-full bg-black/40 border border-white/10 rounded-xl px-4 pt-7 pb-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder-transparent shadow-inner resize-none ${errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Description"
              />
              <label 
                htmlFor="description" 
                className="absolute left-4 top-6 -translate-y-1/2 text-gray-500 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-6 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[18px] peer-focus:text-[10px] peer-focus:text-brand-400 font-medium uppercase tracking-wider"
              >
                Detailed Description
              </label>
              {errors.description && <p className="mt-1.5 text-sm text-red-500">{errors.description.message}</p>}
            </div>

            {/* Category */}
            <div className="relative group">
              <select
                id="category"
                {...register("category")}
                className={`peer w-full bg-black/40 border border-white/10 rounded-xl h-[56px] px-4 pt-5 pb-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-inner appearance-none ${errors.category ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              >
                <option value="" disabled className="bg-gray-900 text-gray-500">Select...</option>
                {AUCTION_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                ))}
              </select>
              <label 
                htmlFor="category" 
                className="absolute left-4 top-[14px] -translate-y-1/2 text-[10px] text-brand-400 pointer-events-none transition-all font-medium uppercase tracking-wider"
              >
                Category
              </label>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
              </div>
              {errors.category && <p className="mt-1.5 text-sm text-red-500">{errors.category.message}</p>}
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-[28px] -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-400 transition-colors z-10" />
                <input
                  type="number"
                  id="startPrice"
                  min="1"
                  step="1"
                  {...register("startPrice")}
                  className={`peer w-full bg-black/40 border border-white/10 rounded-xl h-[56px] pl-11 pr-4 pt-5 pb-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder-transparent shadow-inner ${errors.startPrice ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Starting Price"
                />
                <label 
                  htmlFor="startPrice" 
                  className="absolute left-11 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[14px] peer-focus:text-[10px] peer-focus:text-brand-400 font-medium uppercase tracking-wider"
                >
                  Starting Price
                </label>
                {errors.startPrice && <p className="mt-1.5 text-sm text-red-500">{errors.startPrice.message}</p>}
              </div>

              <div className="relative group">
                <IndianRupee className="absolute left-4 top-[28px] -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-400 transition-colors z-10" />
                <input
                  type="number"
                  id="minIncrement"
                  min="1"
                  step="1"
                  {...register("minIncrement")}
                  className={`peer w-full bg-black/40 border border-white/10 rounded-xl h-[56px] pl-11 pr-4 pt-5 pb-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder-transparent shadow-inner ${errors.minIncrement ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Min Increment"
                />
                <label 
                  htmlFor="minIncrement" 
                  className="absolute left-11 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[14px] peer-focus:text-[10px] peer-focus:text-brand-400 font-medium uppercase tracking-wider"
                >
                  Min Bid Increment
                </label>
                {errors.minIncrement && <p className="mt-1.5 text-sm text-red-500">{errors.minIncrement.message}</p>}
              </div>
            </div>

            {/* Timing */}
            <div className="relative group pt-2">
              <input
                type="datetime-local"
                id="endTime"
                {...register("endTime")}
                className={`peer w-full bg-black/40 border border-white/10 rounded-xl h-[56px] px-4 pt-5 pb-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-inner [color-scheme:dark] ${errors.endTime ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              <label 
                htmlFor="endTime" 
                className="absolute left-4 top-[22px] -translate-y-1/2 text-[10px] text-brand-400 pointer-events-none transition-all font-medium uppercase tracking-wider"
              >
                Auction End Time
              </label>
              {errors.endTime && <p className="mt-1.5 text-sm text-red-500">{errors.endTime.message}</p>}
            </div>

            {/* Submit */}
            <div className="pt-6">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] border-t border-brand-400/30"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin h-5 w-5" /> {uploadStatus || 'Creating Auction...'}</>
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

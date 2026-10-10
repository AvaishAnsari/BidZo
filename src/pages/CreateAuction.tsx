import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { createAuctionAPI, uploadAuctionImage } from '../services/auctionService';
import { Loader2, Camera, ImagePlus, IndianRupee, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { AUCTION_CATEGORIES } from '../constants/auctionCategories';
import BrandMark from '../components/BrandMark';

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

export { AUCTION_CATEGORIES } from '../constants/auctionCategories';

type AuctionFormValues = z.infer<typeof auctionSchema>;

export const CreateAuction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

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

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [isCameraOpen]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setIsCameraOpen(false);
  };

  const openCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera access is unavailable in this browser. You can still choose a photo from your device.');
      cameraInputRef.current?.click();
      return;
    }
    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setIsCameraOpen(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setCameraError(name === 'NotAllowedError'
        ? 'Camera permission was blocked. Allow camera access in your browser settings, or choose a photo instead.'
        : 'Could not open a camera. Check that a camera is connected, or choose a photo instead.');
    }
  };

  const acceptImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Choose an image that is 5 MB or smaller.');
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setCameraError('');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    acceptImageFile(file);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError('Camera is still starting. Please wait a moment and try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Could not capture the photo. Please choose an image from your device.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Could not capture the photo. Please try again.');
        return;
      }
      acceptImageFile(new File([blob], `bidzo-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const onAuctionSubmit = async (data: AuctionFormValues) => {
    if (!user) return;
    if (!selectedImage) {
      toast.error('Choose a photo from your device or camera first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrl = await uploadAuctionImage(selectedImage);
      // ── Django API mode ──────────────────────────────────────────────────
      await createAuctionAPI({
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        image_url: imageUrl,
        starting_price: parseFloat(data.startPrice),
        min_increment: parseFloat(data.minIncrement),
        end_time: new Date(data.endTime).toISOString(),
      });

      toast.success('Auction created successfully! 🎉');
      navigate('/auctions');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create auction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-auction-page max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10 w-full">
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
            <div className="bg-brand-500/10 p-3 rounded-2xl mb-4 inline-block border border-brand-500/20" style={{ color: '#805329' }}>
              <BrandMark size={32} />
            </div>
            <h2 className="text-3xl font-extrabold text-white">Create New Auction</h2>
            <p className="mt-2 text-gray-400">List an exclusive item for bidding</p>

            {/* Seller badge */}
            <div className="listing-kicker" style={{
              marginTop: '0.85rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.9rem',
              borderRadius: '9999px',
              background: 'rgba(196,155,90,0.1)',
              border: '1px solid rgba(196,155,90,0.25)',
              fontSize: '0.72rem', fontWeight: 700, color: '#f0d9ae',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              🏷️ Seller — Create listing
            </div>
          </div>

          <form onSubmit={handleSubmit(onAuctionSubmit)} className="create-auction-form">
            {/* Auction image picker: device library on all screens and direct camera on mobile. */}
            <div className="auction-image-picker">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="sr-only" aria-label="Choose auction photo from device" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="sr-only" aria-label="Take auction photo with camera" />
              {imagePreview ? (
                <div className="auction-image-preview">
                  <img src={imagePreview} alt="Selected auction item preview" />
                  <div className="auction-image-preview-actions">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="auction-image-change">
                      <ImagePlus size={16} /> Choose another
                    </button>
                    <button type="button" onClick={() => void openCamera()} className="auction-image-change">
                      <Camera size={16} /> Retake photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="auction-image-empty">
                  <ImagePlus size={24} aria-hidden="true" />
                  <div>
                    <strong>Add an item photo</strong>
                    <span>JPG, PNG, WEBP, or GIF · up to 5 MB</span>
                  </div>
                  <div className="auction-image-actions">
                    <button type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={16} /> Choose photo</button>
                    <button type="button" onClick={() => void openCamera()}><Camera size={16} /> Use camera</button>
                  </div>
                </div>
              )}
              {cameraError && <p className="auction-camera-error" role="status">{cameraError}</p>}
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
            <div className="auction-end-time-field">
              <label htmlFor="endTime" className="auction-field-label">Auction end time</label>
              <input
                type="datetime-local"
                id="endTime"
                {...register("endTime")}
                className={`w-full bg-black/40 border border-white/10 rounded-xl h-[56px] px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-inner ${errors.endTime ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {errors.endTime && <p className="mt-1.5 text-sm text-red-500">{errors.endTime.message}</p>}
            </div>

            {/* Submit */}
            <div className="pt-6">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                className="create-auction-submit w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(157,108,48,0.24)]"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin h-5 w-5" /> Creating Auction...</>
                ) : (
                  <><BrandMark size={20} /> Create Auction</>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
      {isCameraOpen && (
        <div className="auction-camera-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) closeCamera();
        }}>
          <section className="auction-camera-dialog" role="dialog" aria-modal="true" aria-labelledby="camera-dialog-title">
            <header>
              <h3 id="camera-dialog-title">Take an item photo</h3>
              <button type="button" onClick={closeCamera} aria-label="Close camera"><X size={20} /></button>
            </header>
            <video ref={videoRef} autoPlay playsInline muted />
            {cameraError && <p className="auction-camera-error" role="alert" style={{ margin: '0 1rem' }}>{cameraError}</p>}
            <div className="auction-camera-controls">
              <button type="button" onClick={closeCamera}>Cancel</button>
              <button type="button" onClick={capturePhoto}><Camera size={17} /> Capture photo</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

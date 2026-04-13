-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'bid_update', 'auction_ending', 'outbid', 'system'
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS logic for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true); -- Ideally restrict to service roles or triggers

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT
);

-- Initial Categories
INSERT INTO public.categories (name, slug, icon) VALUES 
('Electronics', 'electronics', 'laptop'),
('Art & Collectibles', 'art-collectibles', 'palette'),
('Vehicles', 'vehicles', 'car'),
('Fashion', 'fashion', 'shirt'),
('Real Estate', 'real-estate', 'home') ON CONFLICT DO NOTHING;

-- Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auction_id UUID REFERENCES public.auctions(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS logic for Ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ratings" ON public.ratings
    FOR SELECT USING (true);
CREATE POLICY "Users can create ratings" ON public.ratings
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Alter Auctions Table to support categories and fraud flags
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS fraud_flag BOOLEAN DEFAULT false;
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS extension_count INTEGER DEFAULT 0;

-- Alter Bids Table to track potentially fraudulent bids
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL, -- Replace with actual orders reference if orders table exists
    user_id UUID REFERENCES public.users(id),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time Subscriptions setup
-- Ensure notifications table broadcasts changes
alter publication supabase_realtime add table notifications;

-- BidZo Database Schema
-- Run this script in your Supabase SQL editor

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('buyer', 'seller', 'admin')),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Auctions Table
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  start_price DECIMAL(12, 2) NOT NULL,
  current_price DECIMAL(12, 2) NOT NULL,
  min_increment DECIMAL(12, 2) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Bids Table
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id),
  buyer_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_end_time ON auctions(end_time);
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_orders_auction_id ON orders(auction_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users Table
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Authenticated users can view all user profiles (for auction creators)
CREATE POLICY "Authenticated users can view all profiles"
ON users FOR SELECT
USING (auth.role() = 'authenticated');

-- RLS Policies for Auctions Table
-- Anyone can view all auctions
CREATE POLICY "Anyone can view all auctions"
ON auctions FOR SELECT
USING (true);

-- Only sellers can create auctions
CREATE POLICY "Only sellers can create auctions"
ON auctions FOR INSERT
WITH CHECK (
  auth.uid() = seller_id AND
  (SELECT role FROM users WHERE id = auth.uid()) = 'seller'
);

-- Only auction owner can update their auction
CREATE POLICY "Auction owners can update their auctions"
ON auctions FOR UPDATE
USING (auth.uid() = seller_id);

-- RLS Policies for Bids Table
-- Authenticated users can create bids
CREATE POLICY "Authenticated users can place bids"
ON bids FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Anyone can view bids for auctions
CREATE POLICY "Anyone can view bids"
ON bids FOR SELECT
USING (true);

-- RLS Policies for Orders Table
-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can view orders for their auctions
CREATE POLICY "Sellers can view orders for their auctions"
ON orders FOR SELECT
USING (
  auth.uid() = (SELECT seller_id FROM auctions WHERE id = auction_id)
);

-- System can insert orders (for payment success)
CREATE POLICY "Authenticated users can insert orders"
ON orders FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create Function: Place Bid with Validation
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_auction RECORD;
  v_current_price DECIMAL;
  v_min_bid DECIMAL;
  v_error_msg TEXT;
  v_top_bidder_id UUID;
BEGIN
  -- Fetch auction
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
  
  IF v_auction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Check if auction is live
  IF v_auction.status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction is not live');
  END IF;

  -- Check if auction has ended
  IF NOW() > v_auction.end_time THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction has ended');
  END IF;

  -- Check minimum bid amount
  v_min_bid := v_auction.current_price + v_auction.min_increment;
  
  IF p_amount < v_min_bid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bid must be at least ' || v_min_bid || ' (current price + min increment)'
    );
  END IF;

  -- Check if user is not the seller
  IF auth.uid() = v_auction.seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seller cannot bid on own auction');
  END IF;

  -- Check if user is already the highest bidder
  SELECT user_id INTO v_top_bidder_id FROM bids WHERE auction_id = p_auction_id ORDER BY amount DESC LIMIT 1;
  IF v_top_bidder_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have the highest bid');
  END IF;

  -- Insert bid
  INSERT INTO bids (auction_id, user_id, amount)
  VALUES (p_auction_id, auth.uid(), p_amount);

  -- Update auction current price
  UPDATE auctions
  SET current_price = p_amount
  WHERE id = p_auction_id;

  RETURN jsonb_build_object('success', true, 'message', 'Bid placed successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Function: End Auction (Set Winner)
CREATE OR REPLACE FUNCTION end_auction(p_auction_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_winner_id UUID;
  v_winning_bid DECIMAL;
  v_auction RECORD;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
  
  IF v_auction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Only allow the seller to end their auction
  IF auth.uid() != v_auction.seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get highest bid
  SELECT user_id, amount INTO v_winner_id, v_winning_bid
  FROM bids
  WHERE auction_id = p_auction_id
  ORDER BY amount DESC
  LIMIT 1;

  -- Update auction status and winner
  UPDATE auctions
  SET status = 'ended', winner_id = v_winner_id
  WHERE id = p_auction_id;

  -- Create order if there are bids
  IF v_winner_id IS NOT NULL THEN
    INSERT INTO orders (auction_id, buyer_id, amount)
    VALUES (p_auction_id, v_winner_id, v_winning_bid);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Auction ended successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

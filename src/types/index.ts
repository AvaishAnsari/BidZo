export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  trust_score?: number;
  rating?: number;
  total_reviews?: number;
  avatar_url?: string;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  image_url: string;
  start_price: number;
  current_price: number;
  min_increment: number;
  start_time: string;
  end_time: string;
  seller_id: string;
  winner_id?: string;
  status: 'upcoming' | 'live' | 'ended';
  category?: string;
  created_at: string;
  /** How many times the end_time has been extended by anti-sniping (max 3) */
  extension_count?: number;
}

export interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export interface Order {
  id: string;
  auction_id: string;
  buyer_id: string;
  amount: number;
  payment_status: 'pending' | 'paid';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'bid_update' | 'auction_ending' | 'outbid' | 'system';
  read: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface Rating {
  id: string;
  auction_id?: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

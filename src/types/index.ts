export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  avatar_url?: string;
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

# BidZo - Real-Time Auction Bidding Platform

Our platform introduces a set of innovative and scalable features designed to enhance the online auction experience. It leverages real-time technology to enable instant bid updates without page refresh, ensuring a seamless and competitive environment for users.

The system incorporates an AI-powered smart bidding assistant that analyzes bidding patterns and suggests optimal bid values, helping users make informed decisions. To maintain platform integrity, advanced validation mechanisms and fraud detection techniques are implemented to prevent fake or malicious bidding activities.

A secure and automated payment workflow is integrated using Razorpay, enabling smooth transaction processing and ensuring reliability. The platform also features a transparent live dashboard that provides real-time insights such as bid history, highest bids, and auction countdown, promoting trust among users.

Built on a scalable serverless architecture using Supabase and PostgreSQL, the system ensures high performance and reliability. Additionally, role-based access control enables efficient management for buyers, sellers, and administrators.

The platform is future-ready, with planned enhancements including AI-based price prediction models, blockchain-backed transparency, and intelligent automation to further optimize the auction ecosystem.

##  Features

- **User Authentication**: Secure registration and login with Supabase Auth
- **Role-Based Access**: Buyer and Seller roles with different permissions
- **Real-Time Bidding**: Live bid updates using Supabase Realtime subscriptions
- **Auction Management**: Create, browse, and participate in auctions
- **Payment Integration**: Razorpay integration for secure payments
- **Image Storage**: Upload auction images to Supabase Storage
- **Row-Level Security**: Database security with RLS policies
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS

##  Project Structure

```
src/
├── components/          # Reusable React components
│   └── ProtectedRoute.tsx    # Route protection for authenticated users
├── context/            # React Context for state management
│   └── AuthContext.tsx       # Authentication state and utilities
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── supabase.ts
├── App.tsx            # Main component with routing
└── index.css          # Global styles with Tailwind
```

##  Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Backend
- **Supabase** - PostgreSQL + Auth + Realtime + Storage
- **PostgreSQL** - Database
- **Row-Level Security (RLS)** - Database-level security

### Payment
- **Razorpay** - Payment gateway integration

##  Setup Guide

### Prerequisites
- Node.js 16.x or higher
- npm or yarn
- Supabase account (free tier available)

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Copy your **Project URL** and **Anonymous Key**

### 3. Setup Database

1. In Supabase, go to SQL Editor
2. Create a new query
3. Copy and paste the contents of `supabase_schema.sql`
4. Run the script to create tables, indexes, and RLS policies

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

##  Authentication Module

### Overview

The authentication module handles user registration, login, and session management using Supabase Auth.

### Key Components

#### AuthContext (`src/context/AuthContext.tsx`)
Manages global authentication state and provides methods:
- `register()` - Create new user account
- `login()` - Sign in existing user
- `logout()` - Sign out user
- `updateProfile()` - Update user profile information

#### useAuth Hook
Custom hook to access authentication context:
```typescript
const { user, isAuthenticated, isLoading, login, register, logout } = useAuth();
```

#### ProtectedRoute Component
Wraps routes that require authentication:
```typescript
<ProtectedRoute requiredRole="seller">
  <CreateAuctionPage />
</ProtectedRoute>
```

### User Registration Flow

1. User fills registration form with email, password, name, and role
2. Frontend validates inputs (password requirements, email format, etc.)
3. Supabase Auth creates user account
4. User profile is stored in `users` table
5. User is automatically logged in after registration

### User Login Flow

1. User enters email and password
2. Supabase authenticates credentials
3. User profile is fetched from database
4. Authentication state is updated
5. User is redirected to home page

##  Database Schema

### Tables

#### users
- Stores user profiles linked to Supabase Auth
- Fields: `id`, `email`, `name`, `role`, `avatar_url`, `created_at`

#### auctions
- Stores auction listings created by sellers
- Fields: `id`, `title`, `description`, `image_url`, `start_price`, `current_price`, `min_increment`, `start_time`, `end_time`, `seller_id`, `status`, `winner_id`, `created_at`

#### bids
- Records all bids placed on auctions
- Fields: `id`, `auction_id`, `user_id`, `amount`, `created_at`

#### orders
- Tracks completed auction transactions
- Fields: `id`, `auction_id`, `buyer_id`, `amount`, `payment_status`, `razorpay_order_id`, `razorpay_payment_id`, `created_at`

### RLS Policies

Database-level security ensures:
- Users can only view their own profiles
- Sellers can only update their own auctions
- Only authenticated users can place bids
- Users can only see orders they are involved in

##  Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Backend (Supabase)

Supabase is hosted and managed - no additional deployment needed.

##  Next Modules to Implement

- [x] Authentication Module (✅ completed)
- [ ] Auction Management Module
- [ ] Real-Time Bidding Module
- [ ] Payment Integration Module
- [ ] User Dashboard Module
- [ ] Image Upload Module

##  Contributing

Contributions are welcome! Please follow these guidelines:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

##  Support

For issues and questions, please open a GitHub issue or contact the development team.

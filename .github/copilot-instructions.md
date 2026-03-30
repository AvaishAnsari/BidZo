_# BidZo - Real-Time Auction Bidding Application

## Project Overview
BidZo is a full-stack real-time auction bidding platform with user authentication, role-based access, live bidding, and payment integration.

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payment**: Razorpay Integration
- **Database**: PostgreSQL with Row-Level Security (RLS)

## Completed Modules

### ✅ Authentication Module
- User registration with role selection (buyer/seller)
- Secure login and logout
- Supabase Auth integration
- Session persistence
- Protected routes with role-based access
- User profile management

**Key Files**:
- `src/context/AuthContext.tsx` - Authentication state management
- `src/pages/LoginPage.tsx` - Login form
- `src/pages/RegisterPage.tsx` - Registration form
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/utils/supabase.ts` - Supabase client setup

## Setup Instructions

### Prerequisites
- Node.js 16+
- Supabase Account
- Razorpay Account (for payments)

### Initial Setup
1. Run `npm install` to install dependencies
2. Create `.env.local` from `.env.example`
3. Add Supabase credentials to `.env.local`
4. Run database schema script in Supabase SQL editor
5. Run `npm run dev` to start development server

### Database Setup
1. Copy content from `supabase_schema.sql`
2. Paste into Supabase SQL Editor
3. Execute to create tables, indexes, and RLS policies
4. Verify tables are created in Supabase dashboard

## Next Steps

### 2️⃣ Auction Management Module (Next Priority)
- Create auction page (seller-only)
- Auction listings page
- Auction detail page
- Search and filtering
- Auction status management

### 3️⃣ Real-Time Bidding Module
- Supabase Realtime subscriptions for bid updates
- Live bid counter
- Auction timer with countdown
- Auto-update highest bid
- Real-time participant count

### 4️⃣ Payment Integration Module
- Razorpay integration
- Order creation
- Payment verification
- Invoice generation

### 5️⃣ Additional Features
- User dashboard
- Order history
- My auctions page
- Seller analytics
- Image upload to Supabase Storage
- Email notifications

## Development Guidelines

### Code Organization
- Place components in `src/components/`
- Create pages in `src/pages/`
- Custom hooks in `src/hooks/`
- Types in `src/types/`
- Utilities in `src/utils/`

### Styling
- Use Tailwind CSS utilities
- Custom CSS in respective component files
- Global styles in `src/index.css`

### API/Database
- Use Supabase client from `src/utils/supabase.ts`
- Leverage RLS for security
- Use SQL functions for complex operations
- Test RLS policies thoroughly

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## Useful Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Important Notes
- All sensitive data should use environment variables
- RLS policies must be tested for each table
- Supabase edge functions can be used for complex logic
- Always validate user input on frontend and backend

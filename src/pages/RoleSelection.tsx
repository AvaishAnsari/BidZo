import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { ShoppingBag, Briefcase, CheckCircle2, ArrowRight, Flame, ShieldCheck, Zap, Star } from 'lucide-react';

const ROLE_OPTIONS: {
  role: UserRole;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  perks: string[];
  gradient: string;
  glow: string;
  border: string;
  badge: string;
}[] = [
  {
    role: 'buyer',
    icon: <ShoppingBag className="w-10 h-10" />,
    title: 'I want to Bid & Buy',
    subtitle: 'Buyer Account',
    description: 'Discover rare items, place strategic bids, and win exclusive auctions from trusted sellers.',
    perks: ['Browse all live auctions', 'Use AI Smart Bid Assistant', 'Real-time outbid notifications', 'Secure Razorpay checkout'],
    gradient: 'from-[#6366f1] to-[#8b5cf6]',
    glow: 'rgba(99,102,241,0.25)',
    border: 'rgba(99,102,241,0.5)',
    badge: '🛒 Most Popular',
  },
  {
    role: 'seller',
    icon: <Briefcase className="w-10 h-10" />,
    title: 'I want to Sell & Earn',
    subtitle: 'Seller Account',
    description: 'List your items for auction, set reserve prices, and reach thousands of active bidders.',
    perks: ['Create unlimited auctions', 'Anti-sniping protection', 'Real-time bid dashboard', 'Seller trust badge & ratings'],
    gradient: 'from-[#f59e0b] to-[#f97316]',
    glow: 'rgba(245,158,11,0.25)',
    border: 'rgba(245,158,11,0.5)',
    badge: '💰 Start Earning',
  },
];

export const RoleSelection = () => {
  const { signUp, user, userName, updateRole } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected || !user) return;
    setLoading(true);

    const MOCK_ACCOUNTS_KEY = 'bidzo_mock_accounts';
    const MOCK_USER_KEY = 'bidzo_mock_user';
    try {
      // Update the accounts store
      const raw = localStorage.getItem(MOCK_ACCOUNTS_KEY);
      if (raw && user.email) {
        const accounts = JSON.parse(raw);
        if (accounts[user.email]) {
          accounts[user.email].role = selected;
          accounts[user.email].role_explicitly_set = true; // mark as deliberately chosen
          localStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(accounts));
        }
      }
      // Update the current session
      const mockUser = localStorage.getItem(MOCK_USER_KEY);
      if (mockUser) {
        const parsed = JSON.parse(mockUser);
        parsed.role = selected;
        parsed.role_explicitly_set = true;
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('[RoleSelection] Failed to update role:', e);
    }

    setLoading(false);
    toast.success(
      selected === 'buyer'
        ? '🛒 Buyer account activated! Start bidding.'
        : '🏷️ Seller account activated! Create your first auction.',
      { duration: 4000 }
    );
    // Update the AuthContext state immediately so ProtectedRoute permits navigation
    updateRole(selected);
    navigate(selected === 'seller' ? '/create-auction' : '/auctions');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#020617] text-white overflow-hidden font-sans px-4 py-12 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)]" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-10"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
          <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-2xl font-extrabold tracking-tight">BidZo</span>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-gray-300 bg-white/5 border border-white/10 mb-5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#c084fc]" />
          One last step before you start
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3 leading-tight">
          How will you use{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#c084fc]">
            BidZo?
          </span>
        </h1>
        <p className="text-gray-400 text-base max-w-md mx-auto">
          {userName ? `Welcome, ${userName}! ` : ''}Choose your account type. You can always update this in your profile settings later.
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl mb-8">
        {ROLE_OPTIONS.map((opt, idx) => {
          const isSelected = selected === opt.role;
          return (
            <motion.button
              key={opt.role}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.1 }}
              onClick={() => setSelected(opt.role)}
              className="relative text-left rounded-2xl p-6 border transition-all duration-300 cursor-pointer overflow-hidden focus:outline-none"
              style={{
                background: isSelected
                  ? `radial-gradient(ellipse at top left, ${opt.glow}, transparent 60%), rgba(15,12,40,0.9)`
                  : 'rgba(15,12,40,0.6)',
                borderColor: isSelected ? opt.border : 'rgba(255,255,255,0.06)',
                boxShadow: isSelected ? `0 0 30px ${opt.glow}` : 'none',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Badge */}
              <div
                className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isSelected ? `linear-gradient(to right, ${opt.gradient.replace('from-', '').replace('to-', '').split(' ').join(', ')})` : 'rgba(255,255,255,0.05)',
                  color: isSelected ? 'white' : '#6b7280',
                }}
              >
                {opt.badge}
              </div>

              {/* Selected checkmark */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute top-3 left-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#c084fc]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mt-2"
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${opt.glow}, transparent)`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? opt.border : 'rgba(255,255,255,0.06)'}`,
                  color: isSelected ? 'white' : '#6b7280',
                  transition: 'all 0.3s',
                }}
              >
                {opt.icon}
              </div>

              <h3 className="text-lg font-extrabold mb-0.5" style={{ color: isSelected ? 'white' : '#d1d5db' }}>
                {opt.title}
              </h3>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: isSelected ? '#c084fc' : '#4b5563' }}>
                {opt.subtitle}
              </p>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                {opt.description}
              </p>

              {/* Perks */}
              <ul className="space-y-1.5">
                {opt.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-2 text-xs font-medium" style={{ color: isSelected ? '#d1d5db' : '#6b7280' }}>
                    <Zap className="w-3 h-3 shrink-0" style={{ color: isSelected ? '#c084fc' : '#374151' }} />
                    {perk}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-6 mb-8 text-xs text-gray-600 font-medium"
      >
        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-500" /> SSL Encrypted</span>
        <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500" /> 12K+ Trusted Users</span>
        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-purple-500" /> Switch Anytime</span>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: selected ? 1 : 0.4, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs"
      >
        <motion.button
          whileHover={selected ? { scale: 1.03 } : {}}
          whileTap={selected ? { scale: 0.97 } : {}}
          onClick={handleContinue}
          disabled={!selected || loading}
          className="w-full relative group overflow-hidden rounded-xl p-[1px] shadow-2xl"
          style={{ opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'not-allowed' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#9333ea] to-[#c084fc] opacity-70 group-hover:opacity-100 transition-opacity blur-sm" />
          <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#9333ea] to-[#c084fc] py-4 rounded-xl text-[15px] font-bold text-white shadow-inner border border-white/10">
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                Continue as {selected ? (selected === 'buyer' ? 'Buyer' : 'Seller') : '...'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};

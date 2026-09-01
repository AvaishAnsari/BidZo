import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Lock, Flame, Eye, EyeOff, ShieldCheck, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  email:    z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type FormVals = z.infer<typeof schema>;

export const Login = () => {
  const { signIn, signInWithGoogle, isConfigured } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);
  const [showPw, setShowPw]     = useState(false);

  const { register, handleSubmit, formState:{errors} } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { email:'', password:'' },
  });

  const from = (location.state as any)?.from?.pathname ?? '/';

  const onSubmit = async (data: FormVals) => {
    setErrorMsg(null); setLoading(true);
    const { error } = await signIn(data.email.trim(), data.password);
    setLoading(false);
    if (error) { setErrorMsg(error); return; }
    toast.success('Welcome back! 👋');
    navigate(from, { replace:true });
  };

  const onGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      // Offline/demo mode — login happened instantly, navigate now
      toast('🔧 Demo mode: signed in with a mock Google account.', {
        icon: '⚠️',
        style: { background: '#1e1b4b', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' },
        duration: 4000,
      });
      navigate(from, { replace: true });
      setLoading(false);
    }
    // In Supabase mode: browser redirects to Google — no further action needed here.
    // Don't reset loading so spinner shows during redirect.
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.15 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#020617] text-white overflow-hidden font-sans">
      
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden border-r border-white/5">
        
        {/* Premium Immersive Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            alt="Abstract Background" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity" 
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f111a]/95 via-[#0f111a]/80 to-[#4f46e5]/30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
          <div className="absolute inset-0 hero-glow opacity-80 mix-blend-screen pointer-events-none"></div>
        </div>

        {/* Top Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Flame className="w-6 h-6 text-white" strokeWidth={2.5}/>
            </div>
            <span className="text-3xl font-extrabold tracking-tight">BidZo</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-xl">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/100?img=11" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=32" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=59" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
            </div>
            <span className="text-xs font-medium text-gray-300 pr-1">12K+ Active Bidders</span>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="z-10 mt-12 space-y-6 max-w-lg">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-gray-200 bg-white/5 border border-white/10 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-[#c084fc]"/> Trusted worldwide
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-[4rem] font-extrabold leading-[1.05] tracking-tight">
            The smarter way <br/> to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#c084fc] drop-shadow-lg">bid & win</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-gray-400 text-lg leading-relaxed max-w-md font-medium">
            Real-time auctions, instant notifications, and secure payments — experience the future of bidding.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="flex items-center gap-10 pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9333ea]/20 to-[#c084fc]/10 border border-[#9333ea]/30 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.15)]">
                <UsersIcon className="w-6 h-6 text-[#c084fc]"/>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white tracking-tight">12K+</div>
                <div className="text-sm font-medium text-gray-400">Active Bidders</div>
              </div>
            </div>
            <div className="w-px h-14 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9333ea]/20 to-[#c084fc]/10 border border-[#9333ea]/30 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.15)]">
                <TrophyIcon className="w-6 h-6 text-[#c084fc]"/>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white tracking-tight">38K+</div>
                <div className="text-sm font-medium text-gray-400">Auctions Won</div>
              </div>
            </div>
          </motion.div>

          {/* Mini Auction Card with Floating Animation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, y: [-8, 8, -8] }} 
            transition={{ opacity: { duration: 0.6, delay: 0.8 }, scale: { duration: 0.6, delay: 0.8 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.4 } }}
            className="mt-10 glass-card rounded-2xl p-4 flex gap-5 items-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50 pointer-events-none"></div>
            <div className="w-36 h-36 rounded-xl overflow-hidden relative shrink-0 shadow-inner">
              <div className="absolute top-2 left-2 z-10 badge-live shadow-lg">Live Auction</div>
              <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=600&auto=format&fit=crop" alt="Premium Watch" className="w-full h-full object-cover"/>
            </div>
            <div className="flex-1 relative z-10">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="font-bold text-base text-white">Premium Watch</h3>
                  <p className="text-xs text-gray-400 font-medium">Luxury Edition</p>
                </div>
                <div className="text-center bg-black/40 rounded-lg px-2 py-1 border border-white/5">
                  <div className="text-[#f43f5e] font-mono text-sm font-bold flex gap-1 tracking-wider">
                    <span>00</span><span className="opacity-50">:</span><span>02</span><span className="opacity-50">:</span><span>45</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-end mt-6">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Current Bid</p>
                  <p className="gradient-text font-extrabold text-xl">₹ 48,750</p>
                </div>
                <div className="btn-gradient text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 shadow-lg pointer-events-none">
                  Place Bid <span className="text-lg leading-none mt-[-2px]">→</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }} className="z-10 mt-12 flex justify-between items-center text-xs font-medium text-gray-500">
          <p>© {new Date().getFullYear()} BidZo. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-300 transition-colors">About</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
          </div>
        </motion.div>
      </div>

      {/* ─── RIGHT PANEL (FORM) ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-[440px] glass-card rounded-3xl p-8 sm:p-12 shadow-[0_0_50px_rgba(0,0,0,0.3)] relative z-10 border border-white/10"
        >
          {/* Subtle inner radial glow */}
          <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent rounded-3xl pointer-events-none"></div>

          <motion.div variants={itemVariants} className="text-center mb-10 relative z-10">
            <h2 className="text-4xl font-extrabold mb-3 gradient-text drop-shadow-sm">Welcome back 👋</h2>
            <p className="text-gray-400 font-medium">Sign in to continue your bidding journey</p>
          </motion.div>

          {errorMsg && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center shadow-lg">
              {errorMsg}
            </motion.div>
          )}

          <motion.button 
            variants={itemVariants} 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGoogle} 
            disabled={loading} 
            className="relative z-10 w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 py-3.5 rounded-xl transition-all text-sm font-bold shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] hover:border-white/20 mb-8"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>

          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8 relative z-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10"></div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">or sign in with email</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10"></div>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            <motion.div variants={itemVariants} className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#c084fc] transition-colors z-10"/>
              <input 
                type="email" 
                id="email"
                {...register('email')} 
                className="peer w-full bg-black/40 border border-white/10 rounded-xl pt-6 pb-2 pl-11 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#9333ea]/50 focus:border-[#c084fc] transition-all placeholder-transparent shadow-inner"
                placeholder="Email Address"
              />
              <label htmlFor="email" className="absolute left-11 top-2 text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#c084fc] pointer-events-none">
                Email Address
              </label>
              {errors.email && <p className="mt-1.5 text-xs font-semibold text-red-400 pl-1">{errors.email.message}</p>}
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#c084fc] transition-colors z-10"/>
                <input 
                  type={showPw ? 'text' : 'password'} 
                  id="password"
                  {...register('password')} 
                  className="peer w-full bg-black/40 border border-white/10 rounded-xl pt-6 pb-2 pl-11 pr-11 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#9333ea]/50 focus:border-[#c084fc] transition-all placeholder-transparent shadow-inner"
                  placeholder="Password"
                />
                <label htmlFor="password" className="absolute left-11 top-2 text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#c084fc] pointer-events-none">
                  Password
                </label>
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#c084fc] transition-colors z-10">
                  {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              <div className="flex justify-end mt-1.5 pr-1">
                <Link to="#" className="text-xs font-semibold text-[#a855f7] hover:text-[#c084fc] transition-colors">Forgot password?</Link>
              </div>
              {errors.password && <p className="mt-1 text-xs font-semibold text-red-400 pl-1">{errors.password.message}</p>}
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-3 pt-1">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" id="remember" className="peer w-5 h-5 rounded-md border border-white/20 bg-black/40 checked:bg-[#9333ea] checked:border-transparent focus:ring-2 focus:ring-[#9333ea]/50 appearance-none transition-all cursor-pointer"/>
                <svg className="absolute w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <label htmlFor="remember" className="text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">Keep me signed in</label>
            </motion.div>

            <motion.button 
              variants={itemVariants} 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading} 
              className="w-full relative group overflow-hidden rounded-xl p-[1px] mt-6 shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#9333ea] to-[#c084fc] opacity-70 group-hover:opacity-100 transition-opacity blur-sm"></div>
              <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#9333ea] to-[#c084fc] py-4 rounded-xl text-[15px] font-bold text-white shadow-inner border border-white/10">
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Flame className="w-5 h-5"/>}
                Sign in securely
              </div>
            </motion.button>
          </form>

          <motion.p variants={itemVariants} className="mt-8 text-center text-sm font-medium text-gray-400 relative z-10">
            New to BidZo? <Link to="/register" className="text-[#c084fc] font-bold hover:text-white transition-colors">Create free account</Link>
          </motion.p>
        </motion.div>

        {/* Global Floating Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-6 right-6 flex gap-3">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
            <Shield className="w-3.5 h-3.5 text-green-400"/> 256-bit SSL secured
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// SVG icons used inline in the left panel for layout aesthetics
function UsersIcon(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
}
function TrophyIcon(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>;
}

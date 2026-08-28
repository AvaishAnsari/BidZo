import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Lock, Gavel, Eye, EyeOff, ShieldCheck, Zap, Shield, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    if (error) { toast.error(error); setLoading(false); }
    else if (!isConfigured) {
      toast.success('Welcome back! 👋');
      navigate(from, { replace:true });
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0f111a] text-white overflow-hidden font-sans">
      
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-white/5 relative" 
           style={{ background: 'linear-gradient(160deg, #181226 0%, #0d0e15 100%)' }}>
        
        {/* Top Header */}
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-white transform -rotate-12" strokeWidth={2.5}/>
            <span className="text-2xl font-bold tracking-tight">BidZo</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/100?img=11" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=32" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=59" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
            </div>
            <span className="text-xs text-gray-300 pr-1">12,000+ Active Bidders</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="z-10 mt-12 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-gray-300 bg-white/5 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-[#a855f7]"/> Trusted by thousands of bidders worldwide
          </div>

          <h1 className="text-[3.5rem] font-bold leading-[1.1] tracking-tight">
            The smarter way <br/> to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#c084fc]">bid & win</span>
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed max-w-md">
            Real-time auctions, instant notifications, and secure payments — all in one place.
          </p>

          <div className="flex items-center gap-10 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#9333ea]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#c084fc]">12K+</div>
                <div className="text-sm text-gray-400">Active Bidders</div>
              </div>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#9333ea]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#c084fc]">38K+</div>
                <div className="text-sm text-gray-400">Auctions Won</div>
              </div>
            </div>
          </div>

          {/* Mini Auction Card */}
          <div className="mt-8 bg-[#141521] border border-white/5 rounded-2xl p-4 flex gap-5 items-center relative overflow-hidden shadow-2xl">
            <div className="w-36 h-36 rounded-xl overflow-hidden relative shrink-0">
              <div className="absolute top-2 left-2 z-10 bg-[#7c3aed]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">Live Auction</div>
              <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=600&auto=format&fit=crop" alt="Premium Watch" className="w-full h-full object-cover"/>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="font-semibold text-sm">Premium Watch</h3>
                  <p className="text-xs text-gray-400">Luxury Edition</p>
                </div>
                <div className="text-center bg-black/20 rounded-md px-2 py-1">
                  <div className="text-[#f43f5e] font-mono text-sm font-bold flex gap-1">
                    <span>00</span><span className="opacity-50">:</span><span>02</span><span className="opacity-50">:</span><span>45</span>
                  </div>
                  <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest flex justify-between px-0.5">
                    <span>HRS</span><span>MIN</span><span>SEC</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Current Bid</p>
                  <p className="text-[#c084fc] font-bold text-lg">₹ 48,750</p>
                </div>
                <button className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1 transition-colors">
                  Place Bid <span className="text-lg leading-none mt-[-2px]">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Features */}
        <div className="z-10 mt-16 grid grid-cols-3 gap-6">
          <div>
            <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4 text-[#c084fc]"/>
            </div>
            <h4 className="text-sm font-semibold mb-1">Real-time Bidding</h4>
            <p className="text-xs text-gray-500">Instant bid updates</p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4 text-[#c084fc]"/>
            </div>
            <h4 className="text-sm font-semibold mb-1">Anti-Sniping</h4>
            <p className="text-xs text-gray-500">Fair play for everyone</p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center mb-3">
              <Lock className="w-4 h-4 text-[#c084fc]"/>
            </div>
            <h4 className="text-sm font-semibold mb-1">Secure Payments</h4>
            <p className="text-xs text-gray-500">Safe & encrypted</p>
          </div>
        </div>

        {/* Footer */}
        <div className="z-10 mt-12 flex justify-between items-center text-xs text-gray-500">
          <p>© 2025 BidZo. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-300 transition-colors">About</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Contact</a>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-[440px] bg-[#161722] border border-white/5 rounded-3xl p-8 sm:p-10 shadow-2xl">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome back 👋</h2>
            <p className="text-gray-400 text-sm">Sign in to continue your bidding journey</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {errorMsg}
            </div>
          )}

          <button onClick={onGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 bg-[#1e202e] hover:bg-[#252838] border border-white/5 py-3 rounded-xl transition-colors text-sm font-semibold mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/5"></div>
            <span className="text-xs text-gray-500 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-white/5"></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                <input type="email" {...register('email')} placeholder="you@example.com" className="w-full bg-[#0d0e15] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[#9333ea] transition-colors placeholder-gray-600"/>
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium">Password</label>
                <a href="#" className="text-xs text-[#a855f7] hover:text-[#c084fc] transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                <input type={showPw?'text':'password'} {...register('password')} placeholder="••••••••" className="w-full bg-[#0d0e15] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-[#9333ea] transition-colors placeholder-gray-600"/>
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-white/20 bg-[#0d0e15] checked:bg-[#9333ea] checked:border-transparent accent-[#9333ea]"/>
              <label htmlFor="remember" className="text-sm text-gray-400">Keep me signed in</label>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#8b5cf6] to-[#c084fc] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 mt-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Gavel className="w-5 h-5"/>}
              Sign in to BidZo
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            New to BidZo? <Link to="/register" className="text-[#a855f7] font-medium hover:text-[#c084fc] transition-colors">Create free account</Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-600">
            <Shield className="w-3.5 h-3.5"/> 256-bit SSL encrypted
          </div>
        </div>

        <button className="absolute bottom-6 right-6 bg-[#161722] border border-white/5 px-4 py-2 rounded-full flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors shadow-lg">
          <Moon className="w-3.5 h-3.5"/> Dark Mode
        </button>
      </div>
    </div>
  );
};

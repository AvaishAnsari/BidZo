import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Lock, Flame, Eye, EyeOff, ShieldCheck, Shield, Users, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const schema = z.object({
  email:    z.string().min(1, 'Email is required.').email('Invalid email address.'),
  password: z.string().optional(),
});
type FormVals = z.infer<typeof schema>;

export const Login = () => {
  const { signIn, signInWithGoogle, signInWithOtp, verifyOtp, isConfigured } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);
  const [showPw, setShowPw]     = useState(false);
  const { executeRecaptcha }    = useGoogleReCaptcha();
  const [useOtp, setUseOtp]     = useState(false);
  const [otpSent, setOtpSent]   = useState(false);
  const [otpValue, setOtpValue] = useState('');

  // Form setup
  const { register, handleSubmit, formState:{errors, touchedFields} } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { email:'', password:'' },
    mode: 'onTouched',
  });

  const from = (location.state as any)?.from?.pathname ?? '/';

  const onSubmit = async (data: FormVals) => {
    setErrorMsg(null); 
    setLoading(true);
    
    // Captcha validation
    if (!executeRecaptcha && isConfigured) {
      setErrorMsg('ReCAPTCHA is still loading. Please wait a moment.');
      setLoading(false);
      return;
    }

    try {
      if (isConfigured && executeRecaptcha) {
        const token = await executeRecaptcha('login');
        if (!token) throw new Error('Failed to verify reCAPTCHA.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
      setLoading(false);
      return;
    }

    // OTP Flow
    if (useOtp) {
      if (!otpSent) {
        const { error } = await signInWithOtp(data.email.trim());
        setLoading(false);
        if (error) { setErrorMsg(error); return; }
        setOtpSent(true);
        toast.success('OTP sent to your email!');
      } else {
        const { error } = await verifyOtp(data.email.trim(), otpValue);
        setLoading(false);
        if (error) { setErrorMsg(error); return; }
        toast.success('Welcome back! 👋');
        navigate(from, { replace: true });
      }
      return;
    }

    // Password Flow
    if (!data.password || data.password.trim().length === 0) {
      setErrorMsg('Password is required.');
      setLoading(false);
      return;
    }

    const { error } = await signIn(data.email.trim(), data.password);
    setLoading(false);
    if (error) { setErrorMsg(error); return; }
    toast.success('Welcome back! 👋');
    navigate(from, { replace: true });
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
      toast('🔧 Demo mode: signed in with a mock Google account.', {
        icon: '⚠️',
        style: { background: '#1e1b4b', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' },
        duration: 4000,
      });
      navigate(from, { replace: true });
      setLoading(false);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#020617] text-white overflow-hidden font-sans">
      
      {/* ─── LEFT PANEL (HERO) ─── */}
      <div className="w-full lg:w-1/2 relative flex flex-col p-8 lg:p-14 border-b lg:border-b-0 lg:border-r border-white/5 min-h-[50vh] lg:min-h-screen overflow-y-auto no-scrollbar">
        
        {/* Background Gradient Mesh (no heavy photo) */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f111a] via-[#161225] to-[#1e1633]"></div>
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#c084fc]/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Navbar / Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative z-20 flex justify-between items-center w-full mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Flame className="w-6 h-6 text-white" strokeWidth={2.5}/>
            </div>
            <span className="text-3xl font-extrabold tracking-tight">BidZo</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-xl">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/100?img=11" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=32" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=59" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
            </div>
            <span className="text-xs font-medium text-gray-300 pr-1">12K+ Active Bidders</span>
          </div>
        </motion.div>

        {/* Main Hero Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center max-w-xl w-full mx-auto lg:mx-0 py-4">
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-gray-200 bg-white/5 border border-white/10 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-[#c084fc]"/> Trusted worldwide
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-4xl lg:text-[4.5rem] font-extrabold leading-[1.05] tracking-tight">
              The smarter way <br className="hidden lg:block"/> to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-[#d8b4fe] drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">bid & win</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-gray-300 text-base lg:text-xl leading-relaxed max-w-md font-medium">
              Real-time auctions, instant notifications, and secure payments — experience the future of bidding.
            </motion.p>

            {/* Stats Row */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="flex items-center gap-8 lg:gap-10 pt-4 lg:pt-6">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#9333ea]/20 to-[#c084fc]/10 border border-[#9333ea]/30 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.15)]">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-[#c084fc]"/>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">12K+</div>
                  <div className="text-xs lg:text-sm font-medium text-gray-400">Active Bidders</div>
                </div>
              </div>
              <div className="w-px h-12 lg:h-14 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#9333ea]/20 to-[#c084fc]/10 border border-[#9333ea]/30 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.15)]">
                  <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-[#c084fc]"/>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">38K+</div>
                  <div className="text-xs lg:text-sm font-medium text-gray-400">Auctions Won</div>
                </div>
              </div>
            </motion.div>

            {/* Live Auction Card Preview */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, y: [-5, 5, -5] }} 
              transition={{ opacity: { duration: 0.6, delay: 0.8 }, scale: { duration: 0.6, delay: 0.8 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.4 } }}
              className="mt-8 lg:mt-10 bg-[#0f111a]/80 backdrop-blur-xl rounded-2xl p-4 flex gap-4 lg:gap-5 items-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#c084fc]/20 hover:border-[#c084fc]/40 transition-colors duration-300"
            >
              {/* Clarify it's a preview */}
              <div className="absolute top-2 right-2 z-10 bg-black/60 text-[9px] font-bold text-gray-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Live Preview
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50 pointer-events-none"></div>
              <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl overflow-hidden relative shrink-0 shadow-inner">
                <div className="absolute top-2 left-2 z-10 bg-rose-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  LIVE
                </div>
                <img src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=600&auto=format&fit=crop" alt="Premium Watch" className="w-full h-full object-cover"/>
              </div>
              <div className="flex-1 relative z-10 flex flex-col justify-between h-full py-1">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm lg:text-base text-white">Premium Watch</h3>
                    <div className="bg-black/60 rounded-md px-2 py-1 border border-white/5">
                      <div className="text-[#f43f5e] font-mono text-xs lg:text-sm font-bold tracking-widest">
                        00:02:45
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-medium">Luxury Edition</p>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Current Bid</p>
                    <p className="text-white font-extrabold text-lg lg:text-xl drop-shadow-md">₹48,750</p>
                  </div>
                  <div className="bg-gradient-to-r from-[#9333ea] to-[#c084fc] hover:brightness-110 text-white text-xs font-bold px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg flex items-center gap-1 shadow-lg transition-all duration-300 pointer-events-none">
                    Place Bid <span className="text-base leading-none">→</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }} className="relative z-20 mt-12 hidden lg:flex justify-between items-center text-xs font-medium text-gray-500 w-full">
          <p>© {new Date().getFullYear()} BidZo. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-300 transition-colors">About</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
          </div>
        </motion.div>
      </div>

      {/* ─── RIGHT PANEL (FORM) ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-[480px] bg-[#0f111a]/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(139,92,246,0.12)] relative z-10 border border-white/10"
        >
          {/* Subtle inner radial glow */}
          <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent rounded-3xl pointer-events-none"></div>

          <div className="flex flex-col gap-[20px] relative z-10">
            
            <motion.div variants={itemVariants} className="text-center">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-sm">Welcome back 👋</h2>
              <p className="text-gray-400 text-sm font-medium">Sign in to continue your bidding journey</p>
            </motion.div>

            {errorMsg && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-[8px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center shadow-lg">
                {errorMsg}
              </motion.div>
            )}

            {/* Google Sign In */}
            <motion.button 
              variants={itemVariants} 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGoogle} 
              disabled={loading} 
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 h-[48px] rounded-[8px] transition-all duration-300 text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </motion.button>

            {/* Divider */}
            <motion.div variants={itemVariants} className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10"></div>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">or sign in with email</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10"></div>
            </motion.div>

            {/* Credentials / OTP Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
              
              {/* Email Input */}
              <motion.div variants={itemVariants} className="relative group mb-[20px] flex flex-col">
                <div className="relative w-full">
                  <Mail className="absolute left-4 top-[50%] -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#c084fc] transition-colors z-10"/>
                  <input 
                    type="email" 
                    id="email" 
                    autoComplete="email"
                    {...register('email')} 
                    className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pl-11 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#9333ea]/50 focus:border-[#c084fc] transition-all placeholder-transparent shadow-inner"
                    placeholder="Email Address"
                  />
                  <label htmlFor="email" className="absolute left-11 top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#c084fc] pointer-events-none">
                    Email Address
                  </label>
                </div>
                {touchedFields.email && errors.email && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.email.message}</p>}
              </motion.div>

              {/* Password Input (shown when not using OTP) */}
              {!useOtp && (
                <motion.div variants={itemVariants} className="flex flex-col">
                  <div className="relative group w-full">
                    <Lock className="absolute left-4 top-[50%] -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#c084fc] transition-colors z-10"/>
                    <input 
                      type={showPw ? 'text' : 'password'} 
                      id="password" 
                      autoComplete="current-password"
                      {...register('password')} 
                      className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pl-11 pr-11 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#9333ea]/50 focus:border-[#c084fc] transition-all placeholder-transparent shadow-inner"
                      placeholder="Password"
                    />
                    <label htmlFor="password" className="absolute left-11 top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#c084fc] pointer-events-none">
                      Password
                    </label>
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-[50%] -translate-y-1/2 text-gray-500 hover:text-[#c084fc] transition-colors z-10">
                      {showPw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                  {touchedFields.password && errors.password && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.password.message}</p>}
                </motion.div>
              )}

              {/* OTP Code Input */}
              {useOtp && otpSent && (
                <motion.div variants={itemVariants} className="flex flex-col">
                  <div className="relative group w-full">
                    <Lock className="absolute left-4 top-[50%] -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#c084fc] transition-colors z-10"/>
                    <input 
                      type="text" 
                      id="otp" 
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pl-11 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#9333ea]/50 focus:border-[#c084fc] transition-all placeholder-transparent shadow-inner"
                      placeholder="Enter OTP"
                    />
                    <label htmlFor="otp" className="absolute left-11 top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#c084fc] pointer-events-none">
                      Enter OTP
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Forgot password & Switch OTP/Password */}
              <motion.div variants={itemVariants} className="flex justify-between items-center px-1 mt-[8px]">
                {!useOtp ? (
                  <Link to="#" className="text-xs font-semibold text-gray-400 hover:text-[#c084fc] transition-colors">Forgot password?</Link>
                ) : (
                  <span className="text-xs text-gray-500">Check your email</span>
                )}
                <button type="button" onClick={() => { setUseOtp(!useOtp); setOtpSent(false); }} className="text-xs font-bold text-[#c084fc] hover:text-[#d8b4fe] transition-colors">
                  {useOtp ? 'Sign in with Password instead' : 'Sign in with Email OTP'}
                </button>
              </motion.div>

              {/* Keep me signed in */}
              <motion.div variants={itemVariants} className="flex items-center gap-3 mt-[12px]">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" id="remember" className="peer w-5 h-5 rounded-md border border-white/20 bg-black/40 checked:bg-[#9333ea] checked:border-transparent focus:ring-2 focus:ring-[#9333ea]/50 appearance-none transition-all cursor-pointer"/>
                  <svg className="absolute w-3 h-3 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <label htmlFor="remember" className="text-sm font-medium text-gray-300 cursor-pointer hover:text-white transition-colors">Keep me signed in</label>
              </motion.div>

              {/* Submit Button */}
              <motion.button 
                variants={itemVariants} 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={loading} 
                className="w-full relative group overflow-hidden rounded-[8px] p-[1px] mt-[16px] shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#9333ea] to-[#c084fc] opacity-80 group-hover:opacity-100 transition-opacity blur-sm"></div>
                <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#9333ea] to-[#c084fc] h-[48px] rounded-[8px] text-sm font-bold text-white shadow-inner border border-white/10">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Flame className="w-5 h-5"/>}
                  {useOtp ? (otpSent ? 'Verify OTP' : 'Send OTP') : 'Sign in securely'}
                </div>
              </motion.button>
            </form>

            <motion.p variants={itemVariants} className="text-center text-sm font-medium text-gray-400">
              New to BidZo? <Link to="/register" className="text-[#c084fc] font-bold hover:text-[#d8b4fe] transition-colors">Create free account</Link>
            </motion.p>

            {/* Legally required reCAPTCHA attribution text */}
            <motion.p variants={itemVariants} className="text-center text-[10px] text-gray-500 leading-relaxed px-4">
              This site is protected by reCAPTCHA and the Google{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-gray-300">Privacy Policy</a> and{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-gray-300">Terms of Service</a> apply.
            </motion.p>

            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
              <Shield className="w-3.5 h-3.5 text-[#34d399]"/> 256-bit SSL encrypted connection
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

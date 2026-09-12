import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, User, Briefcase, Flame, ShieldCheck, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const schema = z.object({
  name:  z.string().min(2, 'At least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  role:  z.enum(['buyer', 'seller'] as const),
});
type FormVals = z.infer<typeof schema>;

export const Register = () => {
  const { signUpOtp, verifyOtp, signInWithGoogle, isConfigured } = useAuth();
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // OTP State
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors, touchedFields } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', role: 'buyer' },
    mode: 'onTouched',
  });

  const role = watch('role');

  const onRequestOtp = useCallback(async (data: FormVals) => {
    setErrorMsg(null); 
    setLoading(true);

    if (!executeRecaptcha && isConfigured) {
      setErrorMsg('ReCAPTCHA is still loading. Please wait a moment.');
      setLoading(false);
      return;
    }

    try {
      if (isConfigured && executeRecaptcha) {
        const token = await executeRecaptcha('register_otp');
        if (!token) throw new Error('Failed to verify reCAPTCHA.');
      }

      const { error } = await signUpOtp(data.email.trim(), data.name.trim(), data.role as UserRole);
      
      if (error) { 
        setErrorMsg(error); 
        setLoading(false);
        return; 
      }
      
      setRegisteredEmail(data.email.trim());
      setStep('otp');
      toast.success(`OTP sent to ${data.email.trim()}!`);
      if (!isConfigured) {
        toast('🔧 Demo mode: use code 123456', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }, [executeRecaptcha, isConfigured, signUpOtp]);

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    
    setErrorMsg(null); 
    setLoading(true);
    
    const { error } = await verifyOtp(registeredEmail, otpCode);
    setLoading(false);
    
    if (error) {
      setErrorMsg(error);
      return;
    }
    
    if (role === 'seller') {
      toast.success('Seller account created! 🏷️ List your first auction.');
      navigate('/create-auction');
    } else {
      toast.success('Welcome to BidZo! Start bidding 🎉');
      navigate('/auctions');
    }
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
      navigate('/');
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
        
        {/* Background Effects */}
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

        {/* Navbar / Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative z-20 flex justify-between items-center w-full mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#c084fc] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <Flame className="w-6 h-6 text-white transform -rotate-12" strokeWidth={2.5}/>
            </div>
            <span className="text-3xl font-extrabold tracking-tight">BidZo</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-xl">
            <div className="flex -space-x-2">
              <img src="https://i.pravatar.cc/100?img=11" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=32" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
              <img src="https://i.pravatar.cc/100?img=59" className="w-6 h-6 rounded-full border-2 border-[#181226]" alt="user"/>
            </div>
            <span className="text-xs font-medium text-gray-300 pr-1">12,000+ Active Bidders</span>
          </div>
        </motion.div>

        {/* Main Hero Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center max-w-xl w-full mx-auto lg:mx-0 py-4">
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-gray-200 bg-white/5 border border-white/10 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-[#c084fc]"/> Trusted by thousands of bidders worldwide
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-4xl lg:text-[4.5rem] font-extrabold leading-[1.05] tracking-tight">
              The smarter way <br className="hidden lg:block"/> to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333ea] to-[#c084fc] drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">bid & win</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-gray-300 text-base lg:text-xl leading-relaxed max-w-md font-medium">
              Real-time auctions, instant notifications, and secure payments — all in one place.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="flex items-center gap-8 lg:gap-10 pt-4 lg:pt-6">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#9333ea]/20 to-[#c084fc]/10 border border-[#9333ea]/30 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.15)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">12K+</div>
                  <div className="text-xs lg:text-sm font-medium text-gray-400">Active Bidders</div>
                </div>
              </div>
              <div className="w-px h-12 lg:h-14 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#9333ea]/20 to-[#c084fc]/10 border border-[#9333ea]/30 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.15)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">38K+</div>
                  <div className="text-xs lg:text-sm font-medium text-gray-400">Auctions Won</div>
                </div>
              </div>
            </motion.div>

            {/* Bottom Features */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="grid grid-cols-3 gap-6 pt-6 mt-6 border-t border-white/10">
              <div>
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-3 shadow-inner">
                  <Zap className="w-5 h-5 text-[#c084fc]"/>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Real-time Bidding</h4>
                <p className="text-xs text-gray-400 font-medium">Instant bid updates</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-3 shadow-inner">
                  <ShieldCheck className="w-5 h-5 text-[#c084fc]"/>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Anti-Sniping</h4>
                <p className="text-xs text-gray-400 font-medium">Fair play for everyone</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-3 shadow-inner">
                  <Shield className="w-5 h-5 text-[#c084fc]"/>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Secure Signups</h4>
                <p className="text-xs text-gray-400 font-medium">OTP & Bot Protection</p>
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
            <a href="#" className="hover:text-gray-300 transition-colors">Contact</a>
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

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {step === 'details' ? (
                <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-[20px]">
                  
                  <motion.div variants={itemVariants} className="text-center">
                    <h2 className="text-3xl lg:text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-sm">Create account ✨</h2>
                    <p className="text-gray-400 text-sm font-medium">Join BidZo — fast, free, and secure</p>
                  </motion.div>

                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-[8px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center shadow-lg">
                      {errorMsg}
                    </motion.div>
                  )}

                  <motion.button 
                    variants={itemVariants} 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGoogle} 
                    disabled={loading} 
                    className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 h-[48px] rounded-[8px] transition-all duration-300 text-sm font-bold shadow-lg"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                  </motion.button>

                  <motion.div variants={itemVariants} className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10"></div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">or with email verification</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10"></div>
                  </motion.div>

                  <form onSubmit={handleSubmit(onRequestOtp)} className="flex flex-col">
                    
                    <motion.div variants={itemVariants} className="relative group mb-[20px] flex flex-col">
                      <div className="relative w-full">
                        <User className="absolute left-4 top-[50%] -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#c084fc] transition-colors z-10"/>
                        <input 
                          type="text" 
                          id="name"
                          {...register('name')} 
                          className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pl-11 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#9333ea]/50 focus:border-[#c084fc] transition-all placeholder-transparent shadow-inner"
                          placeholder="Full Name"
                        />
                        <label htmlFor="name" className="absolute left-11 top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#c084fc] pointer-events-none">
                          Full Name
                        </label>
                      </div>
                      {touchedFields.name && errors.name && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.name.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="relative group mb-[20px] flex flex-col">
                      <div className="relative w-full">
                        <Mail className="absolute left-4 top-[50%] -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#c084fc] transition-colors z-10"/>
                        <input 
                          type="email" 
                          id="email"
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

                    <motion.div variants={itemVariants} className="flex flex-col mb-[16px]">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-[8px] pl-1">Account Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['buyer','seller'] as const).map(r => (
                          <button key={r} type="button" onClick={()=>setValue('role',r,{shouldValidate:true})}
                            className="flex flex-col items-center gap-1.5 py-3 rounded-[8px] border text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] relative"
                            style={role===r
                              ? { border: r === 'seller' ? '2px solid rgba(245,158,11,0.7)' : '2px solid rgba(168,85,247,0.7)',
                                  background: r === 'seller' ? 'rgba(245,158,11,0.12)' : 'rgba(168,85,247,0.12)',
                                  color: r === 'seller' ? '#fbbf24' : '#c084fc',
                                  boxShadow: r === 'seller' ? '0 4px 16px rgba(245,158,11,0.2)' : '0 4px 16px rgba(168,85,247,0.2)' }
                              : { border:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.2)', color:'#6b7280' }
                            }>
                            {role === r && (
                              <span className="absolute top-1.5 right-1.5 text-[10px]">✓</span>
                            )}
                            {r==='buyer' ? <User className="w-5 h-5"/> : <Briefcase className="w-5 h-5"/>}
                            <span className="capitalize font-bold">{r}</span>
                            <span className="text-[10px] font-medium opacity-70">{r === 'buyer' ? 'Bid & Win' : 'Sell & Earn'}</span>
                          </button>
                        ))}
                      </div>
                      {touchedFields.role && errors.role && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.role.message}</p>}
                    </motion.div>

                    <motion.button 
                      variants={itemVariants} 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      disabled={loading} 
                      className="w-full relative group overflow-hidden rounded-[8px] p-[1px] shadow-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#9333ea] to-[#c084fc] opacity-80 group-hover:opacity-100 transition-opacity blur-sm"></div>
                      <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#9333ea] to-[#c084fc] h-[48px] rounded-[8px] text-sm font-bold text-white shadow-inner border border-white/10">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>}
                        Send OTP Verification
                      </div>
                    </motion.button>
                  </form>

                  <motion.p variants={itemVariants} className="text-[10px] text-center text-gray-500">
                    Protected by reCAPTCHA and subject to Google's <a href="https://policies.google.com/privacy" className="text-[#c084fc] hover:text-[#d8b4fe] transition-colors font-semibold">Privacy Policy</a>
                  </motion.p>

                  <motion.p variants={itemVariants} className="text-center text-sm font-medium text-gray-400 mt-[8px]">
                    Have an account? <Link to="/login" className="text-[#c084fc] font-bold hover:text-[#d8b4fe] transition-colors">Sign in →</Link>
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-[20px]">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#9333ea]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#c084fc]/30">
                      <CheckCircle2 className="w-8 h-8 text-[#c084fc]"/>
                    </div>
                    <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-sm">Check your email</h2>
                    <p className="text-gray-400 text-sm font-medium">We've sent a 6-digit code to <br/><span className="text-white font-bold">{registeredEmail}</span></p>
                  </div>

                  {errorMsg && (
                    <div className="p-4 rounded-[8px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center shadow-lg">
                      {errorMsg}
                    </div>
                  )}

                <form onSubmit={onVerifyOtp} className="flex flex-col gap-[20px]">
                  <div>
                    <input 
                      type="text" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                      className="w-full bg-black/40 border border-white/10 rounded-[8px] h-[56px] text-center text-2xl tracking-[0.25em] sm:tracking-[0.5em] font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#9333ea]/50 focus:border-[#c084fc] transition-all shadow-inner"
                      placeholder="Enter OTP"
                    />
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={loading || otpCode.length < 6} 
                      className="w-full relative group overflow-hidden rounded-[8px] p-[1px] shadow-xl disabled:opacity-50 disabled:pointer-events-none mt-[8px]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#9333ea] to-[#c084fc] opacity-80 group-hover:opacity-100 transition-opacity blur-sm"></div>
                      <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#9333ea] to-[#c084fc] h-[48px] rounded-[8px] text-sm font-bold text-white shadow-inner border border-white/10">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ShieldCheck className="w-5 h-5"/>}
                        Verify & Create Account
                      </div>
                    </motion.button>
                    
                    <button type="button" onClick={() => setStep('details')} className="text-center text-sm font-medium text-gray-500 hover:text-white transition-colors">
                      ← Back to edit email
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Global Floating Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-[60px] lg:bottom-6 right-6 hidden sm:flex gap-3 z-30">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 bg-[#161722]/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-lg">
            <Shield className="w-3.5 h-3.5 text-[#34d399]"/> 256-bit SSL secured
          </div>
        </motion.div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Phone, User, Lock, ShieldCheck, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';

const schema = z.object({
  name:  z.string().min(2, 'At least 2 characters.'),
  email: z.string().email('Invalid email address.'),
  phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use country code, for example +919876543210.'),
  password: z.string().min(6, 'At least 6 characters.'),
});
type FormVals = z.infer<typeof schema>;

export const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();


  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, touchedFields } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phoneNumber: '', password: '' },
    mode: 'onTouched',
  });

  const nameVal = watch('name');
  const emailVal = watch('email');
  const phoneVal = watch('phoneNumber');

  const onRegister = async (data: FormVals) => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const { error } = await signUp(data.email, data.password, data.name, 'buyer', data.phoneNumber);
      if (error) throw new Error(error);
      toast.success('Account created. Welcome to BidZo!');
      navigate('/auctions');
    } catch (err: any) {
      setErrorMsg(err instanceof TypeError
        ? 'Could not reach the Django backend. Start PostgreSQL and the backend server at http://127.0.0.1:8000, then try again.'
        : err.message || 'An error occurred.');
    } finally {
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
    <div className="auth-shell min-h-screen w-full flex flex-col lg:flex-row bg-[#020617] text-white overflow-hidden font-sans">

      {/* ─── LEFT PANEL (HERO) ─── */}
      <div className="auth-aside w-full lg:w-1/2 relative flex flex-col p-8 lg:p-14 border-b lg:border-b-0 lg:border-r border-white/5 min-h-[50vh] lg:min-h-screen overflow-y-auto no-scrollbar">

        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
            alt="Abstract Background"
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f111a]/95 via-[#0f111a]/80 to-[#8b5e2c]/30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
          <div className="absolute inset-0 hero-glow opacity-80 mix-blend-screen pointer-events-none"></div>
        </div>

        {/* Navbar / Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative z-20 flex justify-between items-center w-full mb-12">
          <Link to="/" aria-label="BidZo home" className="flex items-center gap-2 text-white no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8e5f2d] to-[#d5b269] text-[#382719] flex items-center justify-center shadow-[0_8px_24px_rgba(157,108,48,0.35)] border border-white/10">
              <BrandMark size={26} />
            </div>
            <span className="text-3xl font-extrabold tracking-tight">BidZo</span>
          </Link>
          <Link to="/login" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Already have an account? Sign in
          </Link>
        </motion.div>

        {/* Main Hero Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center max-w-xl w-full mx-auto lg:mx-0 py-4">
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-gray-200 bg-white/5 border border-white/10 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-[#d4aa5f]"/> Trusted by thousands of bidders worldwide
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-4xl lg:text-[4.5rem] font-extrabold leading-[1.05] tracking-tight">
              The smarter way <br className="hidden lg:block"/> to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b5e2c] to-[#d4aa5f] drop-shadow-[0_0_15px_rgba(196,155,90,0.4)]">bid & win</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-[var(--text-muted)] text-base lg:text-xl leading-relaxed max-w-md font-medium">
              Real-time auctions, instant notifications, and secure payments — all in one place.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="flex items-center gap-8 lg:gap-10 pt-4 lg:pt-6">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#8b5e2c]/20 to-[#d4aa5f]/10 border border-[#8b5e2c]/30 flex items-center justify-center shadow-[0_0_15px_rgba(157,108,48,0.15)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4aa5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">12K+</div>
                  <div className="text-xs lg:text-sm font-medium text-[var(--text-muted)]">Active Bidders</div>
                </div>
              </div>
              <div className="w-px h-12 lg:h-14 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#8b5e2c]/20 to-[#d4aa5f]/10 border border-[#8b5e2c]/30 flex items-center justify-center shadow-[0_0_15px_rgba(157,108,48,0.15)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4aa5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                </div>
                <div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">38K+</div>
                  <div className="text-xs lg:text-sm font-medium text-[var(--text-muted)]">Auctions Won</div>
                </div>
              </div>
            </motion.div>

            {/* Bottom Features */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="grid grid-cols-3 gap-6 pt-6 mt-6 border-t border-[var(--border)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-3 shadow-inner">
                  <Zap className="w-5 h-5 text-[#d4aa5f]"/>
                </div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">Real-time Bidding</h4>
                <p className="text-xs text-[var(--text-muted)] font-medium">Instant bid updates</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-3 shadow-inner">
                  <ShieldCheck className="w-5 h-5 text-[#d4aa5f]"/>
                </div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">Anti-Sniping</h4>
                <p className="text-xs text-[var(--text-muted)] font-medium">Fair play for everyone</p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mb-3 shadow-inner">
                  <Shield className="w-5 h-5 text-[#d4aa5f]"/>
                </div>
                <h4 className="text-sm font-bold text-[var(--text-main)] mb-1">Secure Signups</h4>
                <p className="text-xs text-[var(--text-muted)] font-medium">OTP & Bot Protection</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }} className="relative z-20 mt-12 hidden lg:flex justify-between items-center text-xs font-medium text-[var(--text-muted)] w-full">
          <p>© {new Date().getFullYear()} BidZo. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--text-muted)] transition-colors">About</a>
            <a href="#" className="hover:text-[var(--text-muted)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--text-muted)] transition-colors">Terms</a>
            <a href="#" className="hover:text-[var(--text-muted)] transition-colors">Contact</a>
          </div>
        </motion.div>
      </div>

      {/* ─── RIGHT PANEL (FORM) ─── */}
      <div className="auth-panel w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="auth-card w-full max-w-[480px] bg-[#0f111a]/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(196,155,90,0.12)] relative z-10 border border-white/10"
        >
          {/* Subtle inner radial glow */}
          <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent rounded-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              (
                <motion.div key="details" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-[20px]">

                  <motion.div variants={itemVariants} className="text-center">
                    <h2 className="text-3xl lg:text-4xl font-extrabold mb-2 drop-shadow-sm">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Create account</span>
                      <span className="inline-flex align-middle ml-2 text-[#d4aa5f]" aria-label="BidZo">
                        <BrandMark size={30} />
                      </span>
                    </h2>
                    <p className="text-gray-400 text-sm font-medium">Join BidZo — fast, free, and secure</p>
                  </motion.div>

                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-[8px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center shadow-lg">
                      {errorMsg}
                    </motion.div>
                  )}

                  <motion.p variants={itemVariants} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs leading-relaxed text-gray-400">
                    Enter your email and phone number to create an account. No verification code is needed for this college project.
                  </motion.p>

                  <motion.div variants={itemVariants} className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10"></div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">create your BidZo account</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10"></div>
                  </motion.div>

                  <form onSubmit={handleSubmit(onRegister)} className="flex flex-col">

                    <motion.div variants={itemVariants} className="relative group mb-[20px] flex flex-col">
                      <div className="relative w-full">
                        <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#d4aa5f] transition-all duration-200 pointer-events-none z-10 ${nameVal ? 'opacity-0 scale-75 -translate-x-1' : 'opacity-100 scale-100 translate-x-0'}`}/>
                        <input
                          type="text"
                          id="name"
                          autoComplete="name"
                          {...register('name')}
                          style={{ paddingLeft: '44px' }}
                          className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#8b5e2c]/50 focus:border-[#d4aa5f] transition-all placeholder-transparent shadow-inner"
                          placeholder="Full Name"
                        />
                        <label htmlFor="name" style={{ left: '44px' }} className="absolute top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#d4aa5f] pointer-events-none">
                          Full Name
                        </label>
                      </div>
                      {touchedFields.name && errors.name && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.name.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="relative group mb-[20px] flex flex-col">
                      <div className="relative w-full">
                        <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#d4aa5f] transition-all duration-200 pointer-events-none z-10 ${emailVal ? 'opacity-0 scale-75 -translate-x-1' : 'opacity-100 scale-100 translate-x-0'}`}/>
                        <input
                          type="email"
                          id="email"
                          autoComplete="email"
                          {...register('email')}
                          style={{ paddingLeft: '44px' }}
                          className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#8b5e2c]/50 focus:border-[#d4aa5f] transition-all placeholder-transparent shadow-inner"
                          placeholder="Email Address"
                        />
                        <label htmlFor="email" style={{ left: '44px' }} className="absolute top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#d4aa5f] pointer-events-none">
                          Email Address
                        </label>
                      </div>
                      {touchedFields.email && errors.email && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.email.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="relative group mb-[20px] flex flex-col">
                      <div className="relative w-full">
                        <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#d4aa5f] transition-all duration-200 pointer-events-none z-10 ${phoneVal ? 'opacity-0 scale-75 -translate-x-1' : 'opacity-100 scale-100 translate-x-0'}`} />
                        <input
                          type="tel"
                          id="phoneNumber"
                          autoComplete="tel"
                          {...register('phoneNumber')}
                          style={{ paddingLeft: '44px' }}
                          className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#8b5e2c]/50 focus:border-[#d4aa5f] transition-all placeholder-transparent shadow-inner"
                          placeholder="Mobile Number (+919876543210)"
                        />
                        <label htmlFor="phoneNumber" style={{ left: '44px' }} className="absolute top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#d4aa5f] pointer-events-none">
                          Mobile Number (include country code)
                        </label>
                      </div>
                      {touchedFields.phoneNumber && errors.phoneNumber && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.phoneNumber.message}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex flex-col mb-[16px]">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-[#d4aa5f] transition-colors"/>
                        </div>
                        <input
                          id="password"
                          type="password"
                          {...register('password')}
                          style={{ paddingLeft: '44px' }}
                          className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#8b5e2c]/50 focus:border-[#d4aa5f] transition-all placeholder-transparent shadow-inner"
                          placeholder="Password"
                        />
                        <label htmlFor="password" style={{ left: '44px' }} className="absolute top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#d4aa5f] pointer-events-none">
                          Password
                        </label>
                      </div>
                      {touchedFields.password && errors.password && <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.password.message}</p>}
                    </motion.div>

                    <motion.p variants={itemVariants} className="mb-4 text-center text-xs leading-relaxed text-gray-400">
                      One account lets you bid on items and list your own auctions.
                    </motion.p>

                    <motion.button
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="w-full relative group overflow-hidden rounded-[8px] p-[1px] shadow-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#8b5e2c] to-[#d4aa5f] opacity-80 group-hover:opacity-100 transition-opacity blur-sm"></div>
                      <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#8b5e2c] to-[#d4aa5f] h-[48px] rounded-[8px] text-sm font-bold text-white shadow-inner border border-white/10">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>}
                        Create Account
                      </div>
                    </motion.button>
                  </form>

                  <motion.p variants={itemVariants} className="text-[10px] text-center text-gray-500">
                    Your email and phone are saved to your account; no verification code is sent.
                  </motion.p>

                  <motion.p variants={itemVariants} className="text-center text-sm font-medium text-gray-400 mt-[8px]">
                    Have an account? <Link to="/login" className="text-[#d4aa5f] font-bold hover:text-[#f0d9ae] transition-colors">Sign in →</Link>
                  </motion.p>
                </motion.div>
              )
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Global Floating Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-[60px] lg:bottom-6 right-6 hidden sm:flex gap-3 z-30">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-muted)] bg-[#161722]/80 backdrop-blur-md px-4 py-2 rounded-full border border-[var(--border)] shadow-lg">
            <Shield className="w-3.5 h-3.5 text-[#34d399]"/> 256-bit SSL secured
          </div>
        </motion.div>
      </div>
    </div>
  );
};

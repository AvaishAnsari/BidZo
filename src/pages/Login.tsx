import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Phone, Lock, Eye, EyeOff, ShieldCheck, Shield, Users, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { GoogleLogin } from '@react-oauth/google';
import BrandMark from '../components/BrandMark';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const hasGoogleConfig = clientId && clientId !== 'your_google_client_id_here' && clientId !== '';

const schema = z.object({
  email: z.string().min(1, 'Enter your email address or mobile number.'),
  password: z.string().optional(),
});
type FormVals = z.infer<typeof schema>;

export const Login = () => {
  const { signIn, signInWithGoogle, signInWithOtp, verifyOtp, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [useOtp, setUseOtp] = useState(false);
  const [otpChannel, setOtpChannel] = useState<'email' | 'sms'>('email');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const emailVal = watch('email');
  const passwordVal = watch('password');

  const from = (location.state as any)?.from?.pathname ?? '/';

  const onSubmit = async (data: FormVals) => {
    setErrorMsg(null);
    setLoading(true);

    let captchaToken = '';
    // Captcha validation
    if (!executeRecaptcha && isConfigured) {
      setErrorMsg('ReCAPTCHA is still loading. Please wait a moment.');
      setLoading(false);
      return;
    }

    // Captcha validation (Bypassed if it fails in local dev due to test keys)
    try {
      if (isConfigured && executeRecaptcha) {
        captchaToken = await executeRecaptcha('login');
        if (!captchaToken) throw new Error('Failed to verify reCAPTCHA.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not verify this sign-in request.');
      setLoading(false);
      return;
    }

    // Request or verify an email/mobile one-time code.
    if (useOtp) {
      const identifier = data.email.trim();
      const result = otpSent
        ? await verifyOtp(identifier, otpValue, otpChannel, captchaToken)
        : await signInWithOtp(identifier, otpChannel, captchaToken);
      if (result.error) {
        setErrorMsg(result.error);
        toast.error(result.error);
      } else if (otpSent) {
        toast.success('You are signed in.');
        navigate(from, { replace: true });
      } else {
        setOtpSent(true);
        toast.success(otpChannel === 'email' ? 'Check your email for the code.' : 'Check your phone for the code.');
      }
      setLoading(false);
      return;
    }

    // Password Flow (Django API Integration via AuthContext)
    if (!data.password || data.password.trim().length === 0) {
      setErrorMsg(t('auth.passwordRequired', 'Password is required.'));
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(data.email.trim(), data.password, captchaToken);
      if (error) {
        setErrorMsg(error);
      } else {
        toast.success(t('auth.welcomeBackToast', 'Welcome back! 👋'));
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('[Login] Connection error:', err);
      setErrorMsg('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <div className="auth-shell min-h-screen w-full flex flex-col lg:flex-row bg-[#020617] text-white overflow-hidden font-sans">
      {/* ─── LEFT PANEL (HERO) ─── */}
      <div className="auth-aside w-full lg:w-1/2 relative flex flex-col p-8 lg:p-14 border-b lg:border-b-0 lg:border-r border-white/5 min-h-[50vh] lg:min-h-screen overflow-y-auto no-scrollbar">
        {/* Background Gradient Mesh */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f111a] via-[#161225] to-[#1e1633]"></div>
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#c49b5a]/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#d4aa5f]/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Navbar / Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-20 flex justify-between items-center w-full mb-12"
        >
          <Link to="/" aria-label="BidZo home" className="flex items-center gap-2 text-white no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8e5f2d] to-[#d5b269] text-[#382719] flex items-center justify-center shadow-[0_8px_24px_rgba(157,108,48,0.35)] border border-white/10">
              <BrandMark size={26} />
            </div>
            <span className="text-3xl font-extrabold tracking-tight">BidZo</span>
          </Link>
          <Link to="/register" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Create account
          </Link>
        </motion.div>

        {/* Main Hero Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-center max-w-xl w-full mx-auto lg:mx-0 py-4">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-[var(--text-main)] bg-[var(--elevated)] border border-[var(--border)] backdrop-blur-md"
            >
              <ShieldCheck className="w-4 h-4 text-[#d4aa5f]" /> Trusted worldwide
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl lg:text-[4.5rem] font-extrabold leading-[1.05] tracking-tight"
            >
              The smarter way <br className="hidden lg:block" /> to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c49b5a] to-[#f0d9ae] drop-shadow-[0_0_15px_rgba(196,155,90,0.4)]">
                bid & win
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-[var(--text-muted)] text-base lg:text-xl leading-relaxed max-w-md font-medium"
            >
              Real-time auctions, instant notifications, and secure payments — experience the future of bidding.
            </motion.p>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center gap-8 lg:gap-10 pt-4 lg:pt-6"
            >
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#8b5e2c]/20 to-[#d4aa5f]/10 border border-[#8b5e2c]/30 flex items-center justify-center shadow-[0_0_15px_rgba(157,108,48,0.15)]">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-[#d4aa5f]" />
                </div>
                <div>
                  <div className="text-lg lg:text-xl font-extrabold text-white tracking-tight">Live bidding</div>
                  <div className="text-xs lg:text-sm font-medium text-gray-400">Follow every bid</div>
                </div>
              </div>
              <div className="w-px h-12 lg:h-14 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#8b5e2c]/20 to-[#d4aa5f]/10 border border-[#8b5e2c]/30 flex items-center justify-center shadow-[0_0_15px_rgba(157,108,48,0.15)]">
                  <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-[#d4aa5f]" />
                </div>
                <div>
                  <div className="text-lg lg:text-xl font-extrabold text-white tracking-tight">One account</div>
                  <div className="text-xs lg:text-sm font-medium text-gray-400">Buy or sell on BidZo</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="relative z-20 mt-12 hidden lg:flex justify-between items-center text-xs font-medium text-[var(--text-muted)] w-full"
        >
          <p>© {new Date().getFullYear()} BidZo. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--text-muted)] transition-colors">About</a>
            <a href="#" className="hover:text-[var(--text-muted)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--text-muted)] transition-colors">Terms</a>
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

          <div className="flex flex-col gap-[20px] relative z-10">
            <motion.div variants={itemVariants} className="text-center">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-sm">
                {t('auth.welcomeBack', 'Welcome back 👋')}
              </h2>
              <p className="text-[var(--text-muted)] text-sm font-medium">
                {t('auth.signInToContinue', 'Sign in to continue your bidding journey')}
              </p>
            </motion.div>

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-[8px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center shadow-lg"
              >
                {errorMsg}
              </motion.div>
            )}

            {/* Google Sign In */}
            <motion.div variants={itemVariants} className="w-full flex items-center justify-center">
              {hasGoogleConfig ? (
                <div className="w-full">
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      setLoading(true);
                      if (credentialResponse.credential) {
                        const { error } = await signInWithGoogle(credentialResponse.credential);
                        if (error) {
                          setErrorMsg(error);
                        } else {
                          toast.success(t('auth.welcomeBackToast', 'Welcome back! 👋'));
                          navigate(from, { replace: true });
                        }
                      }
                      setLoading(false);
                    }}
                    onError={() => {
                      setErrorMsg('Google Sign-In failed.');
                    }}
                    theme="filled_black"
                    size="large"
                    width="100%"
                    text="continue_with"
                  />
                </div>
              ) : (
                <motion.button
                  type="button"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setErrorMsg('Google configuration is missing. Please set VITE_GOOGLE_CLIENT_ID in your .env file.')}
                  className="w-full flex items-center justify-center gap-3 bg-[var(--elevated)] hover:bg-white/10 backdrop-blur-md border border-[var(--border)] h-[48px] rounded-[8px] transition-all duration-300 text-sm font-bold shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </motion.button>
              )}
            </motion.div>

            {/* Divider */}
            <motion.div variants={itemVariants} className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10"></div>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">sign in with email or mobile</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10"></div>
            </motion.div>

            {/* Credentials / OTP Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
              {/* Email Input */}
              <motion.div variants={itemVariants} className="relative group mb-[20px] flex flex-col">
                <div className="relative w-full">
                  {useOtp && otpChannel === 'sms' ? <Phone
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#d4aa5f] transition-all duration-200 pointer-events-none z-10 ${emailVal ? 'opacity-0 scale-75 -translate-x-1' : 'opacity-100 scale-100 translate-x-0'}`}
                  /> : <Mail
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#d4aa5f] transition-all duration-200 pointer-events-none z-10 ${
                      emailVal ? 'opacity-0 scale-75 -translate-x-1' : 'opacity-100 scale-100 translate-x-0'
                    }`}
                  />}
                  <input
                    type={useOtp && otpChannel === 'sms' ? 'tel' : 'email'}
                    id="email"
                    autoComplete={useOtp && otpChannel === 'sms' ? 'tel' : 'email'}
                    {...register('email')}
                    style={{ paddingLeft: '44px' }}
                    className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#8b5e2c]/50 focus:border-[#d4aa5f] transition-all placeholder-transparent shadow-inner"
                    placeholder={useOtp && otpChannel === 'sms' ? 'Mobile number, e.g. +919876543210' : t('auth.emailAddress', 'Email Address')}
                  />
                  <label
                    htmlFor="email"
                    style={{ left: '44px' }}
                    className="absolute top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#d4aa5f] pointer-events-none"
                  >
                    {useOtp && otpChannel === 'sms' ? 'Mobile Number' : useOtp ? 'Email Address' : t('auth.emailAddress', 'Email Address')}
                  </label>
                </div>
                {touchedFields.email && errors.email && (
                  <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.email.message}</p>
                )}
              </motion.div>

              {useOtp && (
                <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="OTP delivery method">
                  {(['email', 'sms'] as const).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => { setOtpChannel(channel); setOtpSent(false); setOtpValue(''); setErrorMsg(null); }}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${otpChannel === channel ? 'border-teal-400/60 bg-teal-500/10 text-teal-200' : 'border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/[0.06]'}`}
                    >
                      {channel === 'email' ? 'Email code' : 'Mobile code'}
                    </button>
                  ))}
                </div>
              )}

              {/* Password Input (shown when not using OTP) */}
              {!useOtp && (
                <motion.div variants={itemVariants} className="flex flex-col">
                  <div className="relative group w-full">
                    <Lock
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#d4aa5f] transition-all duration-200 pointer-events-none z-10 ${
                        passwordVal ? 'opacity-0 scale-75 -translate-x-1' : 'opacity-100 scale-100 translate-x-0'
                      }`}
                    />
                    <input
                      type={showPw ? 'text' : 'password'}
                      id="password"
                      autoComplete="current-password"
                      {...register('password')}
                      style={{ paddingLeft: '44px', paddingRight: '44px' }}
                      className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#8b5e2c]/50 focus:border-[#d4aa5f] transition-all placeholder-transparent shadow-inner"
                      placeholder={t('auth.password', 'Password')}
                    />
                    <label
                      htmlFor="password"
                      style={{ left: '44px' }}
                      className="absolute top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#d4aa5f] pointer-events-none"
                    >
                      {t('auth.password', 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#d4aa5f] transition-colors z-10"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {touchedFields.password && errors.password && (
                    <p className="text-[10px] font-semibold text-red-400 pl-1 mt-1">{errors.password.message}</p>
                  )}
                </motion.div>
              )}

              {/* OTP Code Input */}
              {useOtp && otpSent && (
                <motion.div variants={itemVariants} className="flex flex-col">
                  <div className="relative group w-full">
                    <Lock
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#d4aa5f] transition-all duration-200 pointer-events-none z-10 ${
                        otpValue ? 'opacity-0 scale-75 -translate-x-1' : 'opacity-100 scale-100 translate-x-0'
                      }`}
                    />
                    <input
                      type="text"
                      id="otp"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      style={{ paddingLeft: '44px' }}
                      className="peer w-full h-[48px] bg-black/40 border border-white/10 rounded-[8px] pt-4 pb-1 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#8b5e2c]/50 focus:border-[#d4aa5f] transition-all placeholder-transparent shadow-inner"
                      placeholder="Enter OTP"
                    />
                    <label
                      htmlFor="otp"
                      style={{ left: '44px' }}
                      className="absolute top-[6px] text-[10px] uppercase font-bold tracking-wider text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-[14px] peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-[6px] peer-focus:text-[10px] peer-focus:uppercase peer-focus:font-bold peer-focus:text-[#d4aa5f] pointer-events-none"
                    >
                      Enter OTP
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Forgot password & Switch OTP/Password */}
              <motion.div variants={itemVariants} className="flex justify-between items-center px-1 mt-[8px]">
                {!useOtp ? (
                  <Link to="#" className="text-xs font-semibold text-gray-400 hover:text-[#d4aa5f] transition-colors">
                    Forgot password?
                  </Link>
                ) : (
                  <span className="text-xs text-gray-500">Check your {otpChannel === 'email' ? 'email' : 'phone'} for the code</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUseOtp(!useOtp);
                    setOtpSent(false);
                    setOtpValue('');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-bold text-[#d4aa5f] hover:text-[#f0d9ae] transition-colors"
                >
                  {useOtp ? 'Sign in with password' : 'Sign in with OTP'}
                </button>
              </motion.div>

              {/* Authentication is intentionally isolated per tab. */}
              <motion.div variants={itemVariants} className="mt-[12px] px-1 text-xs text-gray-400">
                This tab has its own sign-in, so you can use separate accounts in other tabs.
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
                <div className="absolute inset-0 bg-gradient-to-r from-[#8b5e2c] to-[#d4aa5f] opacity-80 group-hover:opacity-100 transition-opacity blur-sm"></div>
                <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-[#8b5e2c] to-[#d4aa5f] h-[48px] rounded-[8px] text-sm font-bold text-white shadow-inner border border-white/10">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center text-[#382719]"><BrandMark size={20} /></span>}
                  {useOtp ? (otpSent ? 'Verify code' : 'Send code') : 'Sign in securely'}
                </div>
              </motion.button>
            </form>

            <motion.p variants={itemVariants} className="text-center text-sm font-medium text-[var(--text-muted)]">
              New to BidZo?{' '}
              <Link to="/register" className="text-[#d4aa5f] font-bold hover:text-[#f0d9ae] transition-colors">
                Create free account
              </Link>
            </motion.p>



            <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
              <Shield className="w-3.5 h-3.5 text-[#34d399]" /> 256-bit SSL encrypted connection
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

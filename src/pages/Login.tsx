import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Lock, Gavel, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login = () => {
  const { signIn, signInWithGoogle, isConfigured } = useAuth();
  const { isDark } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Redirect back to the page the user came from (or home)
  const from = (location.state as any)?.from?.pathname ?? '/';

  const onLoginSubmit = async (data: LoginFormValues) => {
    setErrorMsg(null);
    setLoading(true);

    const { error } = await signIn(data.email.trim(), data.password);

    setLoading(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    toast.success('Welcome back! 👋');
    navigate(from, { replace: true });
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10 w-full"
    >
      {/* Glow blob */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-64 blur-[100px] rounded-full -z-10 pointer-events-none ${isDark ? 'bg-brand-500/10' : 'bg-pink-400/20'}`} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 glass-card p-10 rounded-3xl relative"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-gradient-to-br from-brand-500 to-accent-500 p-3 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] mb-6 inline-block border border-white/10">
            <Gavel className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Welcome back
          </h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in to your BidZo account to continue
          </p>

          {/* Offline badge */}
          {!isConfigured && (
            <div style={{
              marginTop: '0.75rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.85rem',
              borderRadius: '9999px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              fontSize: '0.72rem', fontWeight: 600, color: '#a5b4fc',
            }}>
              🔌 Offline mode — using local accounts
            </div>
          )}
        </div>

        {/* Inline error */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                padding: '0.85rem 1rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '0.75rem',
                color: '#fca5a5', fontSize: '0.85rem',
              }}
            >
              <AlertCircle style={{ width: '1rem', height: '1rem', flexShrink: 0, marginTop: '0.1rem' }} />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 space-y-6">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogleLogin}
            disabled={loading || !isConfigured}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark 
              ? 'border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800' 
              : 'border-gray-300 bg-white shadow-sm text-gray-800 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </motion.button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 rounded-full ${isDark ? 'bg-gray-950 text-gray-500' : 'bg-white text-gray-400'}`}>Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  {...register("email")}
                  className={`pl-10 block w-full rounded-xl border px-3 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm shadow-inner ${
                    errors.email ? 'border-red-500' : (isDark ? 'border-gray-700 bg-gray-900/50 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400')
                  }`}
                  placeholder="you@email.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  {...register("password")}
                  className={`pl-10 block w-full rounded-xl border px-3 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm shadow-inner ${
                    errors.password ? 'border-red-500' : (isDark ? 'border-gray-700 bg-gray-900/50 text-white placeholder-gray-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400')
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
            </div>
          </div>

          {/* Remember / Forgot */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className={`h-4 w-4 text-brand-500 focus:ring-brand-500 rounded ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}
              />
              <label htmlFor="remember-me" className={`ml-2 block text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-brand-400 hover:text-brand-300 transition-colors">
                Forgot password?
              </a>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-500 active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-70 disabled:cursor-not-allowed border-t border-brand-400/30"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Signing in…</>
            ) : (
              <span className="relative z-10">Sign in</span>
            )}
          </motion.button>
        </form>
      </div>

        <div className="mt-6 text-center">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-400 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

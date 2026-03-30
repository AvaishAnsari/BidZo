import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Lock, User, Briefcase, Gavel, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';

export const Register = () => {
  const { signUp, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState<UserRole>('buyer');
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim(), role);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    toast.success('Account created! Welcome to BidZo 🎉');
    navigate('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative w-full z-10">
      {/* Glow blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-64 bg-accent-500/10 blur-[100px] rounded-full -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 glass-card p-10 rounded-3xl relative"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-gradient-to-br from-brand-500 to-accent-500 p-3 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] mb-6 inline-block border border-white/10">
            <Gavel className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Join BidZo to start bidding and selling
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
              🔌 Offline mode — account saved locally
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

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="register-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrorMsg(null); }}
                  className="pl-10 block w-full rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm shadow-inner"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
                  className="pl-10 block w-full rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm shadow-inner"
                  placeholder="you@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                  className="pl-10 block w-full rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm shadow-inner"
                  placeholder="Min. 6 characters"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  id="role-buyer"
                  onClick={() => setRole('buyer')}
                  className={`flex items-center justify-center px-4 py-3 border rounded-xl shadow-sm space-x-2 transition-all ${
                    role === 'buyer'
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:bg-gray-800 focus:outline-none'
                  }`}
                >
                  <User className={`w-5 h-5 ${role === 'buyer' ? 'text-brand-400' : 'text-gray-500'}`} />
                  <span className="font-medium">Buyer</span>
                </button>

                <button
                  type="button"
                  id="role-seller"
                  onClick={() => setRole('seller')}
                  className={`flex items-center justify-center px-4 py-3 border rounded-xl shadow-sm space-x-2 transition-all ${
                    role === 'seller'
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:bg-gray-800 focus:outline-none'
                  }`}
                >
                  <Briefcase className={`w-5 h-5 ${role === 'seller' ? 'text-brand-400' : 'text-gray-500'}`} />
                  <span className="font-medium">Seller</span>
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {role === 'seller'
                  ? '✓ Sellers can list items and create auctions'
                  : '✓ Buyers can browse and bid on auctions'}
              </p>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] border-t border-brand-400/30"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating account…</>
            ) : (
              <span className="relative z-10">Create account</span>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

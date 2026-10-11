import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Flame, LogOut, Sun, Moon, Bell, Search, Heart, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchlist } from '../hooks/useWatchlist';


import { useNotifications } from '../context/NotificationContext';
import BackToTop from './BackToTop';

const BackgroundDecorations = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden xl:block">
    {/* Dotted Grid Overlay with mask to only show on edges */}
    <div
      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
      style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, var(--text-main) 1px, transparent 0)',
        backgroundSize: '32px 32px',
        maskImage: 'linear-gradient(to right, black 0%, transparent 20%, transparent 80%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 20%, transparent 80%, black 100%)'
      }}
    />

    {/* Left Side Glows & Assets */}
    <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] bg-[var(--primary)]/10 rounded-full blur-[120px]"></div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4, y: [-10, 10, -10], rotate: [0, 5, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-[30%] left-[2%] w-48 h-48 drop-shadow-[0_0_30px_rgba(139,92,246,0.4)] mix-blend-screen"
    >
      {/* Abstract 3D Gavel Representation */}
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 160L80 120L120 160L80 200L40 160Z" fill="url(#grad1)" />
        <path d="M70 110L140 40L170 70L100 140L70 110Z" fill="url(#grad2)" />
        <path d="M130 30L170 70L190 50L150 10L130 30Z" fill="url(#grad1)" />
        <circle cx="160" cy="40" r="15" fill="var(--primary)" opacity="0.6" filter="blur(10px)"/>
        <defs>
          <linearGradient id="grad1" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--primary)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id="grad2" x1="0" y1="200" x2="200" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>

    {/* Right Side Glows & Assets */}
    <div className="absolute top-[40%] -right-[10%] w-[600px] h-[600px] bg-[var(--accent)]/10 rounded-full blur-[120px]"></div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4, y: [10, -10, 10], rotate: [0, -5, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-[45%] right-[2%] w-56 h-56 drop-shadow-[0_0_30px_rgba(236,72,153,0.4)] mix-blend-screen"
    >
      {/* Abstract Antique Vase Representation */}
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 10L180 80L140 190H60L20 80L100 10Z" fill="url(#grad3)" />
        <path d="M100 10V190" stroke="var(--bg)" strokeWidth="4" />
        <path d="M20 80H180" stroke="var(--bg)" strokeWidth="4" />
        <circle cx="100" cy="100" r="20" fill="var(--accent)" opacity="0.6" filter="blur(15px)"/>
        <defs>
          <linearGradient id="grad3" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  </div>
);

const centerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '1.5rem',
  paddingRight: '1.5rem',
  width: '100%',
  position: 'relative',
  zIndex: 10
};

export const Layout = () => {
  const { user, role, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { watchlist } = useWatchlist();
  const navigate = useNavigate();

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-[var(--bg)] text-[var(--text-main)] transition-colors duration-300 relative">
      <BackgroundDecorations />
      {/* Navigation */}
      <header className="navbar relative z-20">
        <div style={centerStyle}>
          <div className="flex justify-between items-center h-[72px] gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-8 shrink-0">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 no-underline group">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="bg-[var(--primary)] p-1.5 rounded-full shadow-md flex items-center justify-center"
                >
                  <Flame className="w-5 h-5 text-white" />
                </motion.div>
                <span className="text-xl font-black tracking-tight bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent transition-colors pr-2 drop-shadow-sm">
                  BidZo
                </span>
              </Link>

              {/* Nav Links */}
              <nav className="hidden xl:flex items-center gap-6 font-semibold text-[0.9rem]">
                <Link to="/auctions" className="text-[var(--primary)] border-b-2 border-[var(--primary)] pb-1 no-underline">Auctions</Link>
                <Link to="/watchlist" className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-red-400 no-underline transition-colors">
                  <Heart size={15} className={watchlist.length > 0 ? "fill-red-500/20 text-red-500" : ""} />
                  <span>Wishlist</span>
                  {watchlist.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      {watchlist.length}
                    </span>
                  )}
                </Link>
                <div className="relative group py-2 flex items-center">
                  <button className="flex items-center gap-1 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors bg-transparent border-none cursor-pointer font-semibold text-[0.9rem] p-0 h-full">
                    Categories <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:rotate-180"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  <div className="absolute top-full left-0 w-48 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform translate-y-2 group-hover:translate-y-0">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden py-2 backdrop-blur-md">
                      {['Electronics', 'Fashion', 'Watches', 'Jewelry', 'Antiques', 'Vehicles', 'Sports', 'Collectibles'].map(cat => (
                        <Link key={cat} to={`/auctions?category=${cat}`} className="block px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--primary)]/10 no-underline transition-colors">
                          {cat}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <a href="/#how-it-works" className="text-[var(--text-muted)] hover:text-[var(--text-main)] no-underline transition-colors">How It Works</a>
                <Link to="/create-auction" className="text-[var(--text-muted)] hover:text-[var(--text-main)] no-underline transition-colors">Sell on BidZo</Link>
                {role === 'admin' && (
                  <Link to="/admin" className="text-purple-400 font-bold hover:text-purple-300 no-underline transition-colors flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-xl hidden md:flex items-center bg-[var(--elevated)] border border-[var(--border)] rounded-full px-4 py-2 focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)] transition-all shadow-inner">
              <Search className="text-[var(--text-muted)] w-4 h-4 shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search auctions, products and categories..."
                className="w-full bg-transparent border-none outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] font-medium"
              />
            </div>

            <nav className="flex items-center gap-3">
              <motion.button
                onClick={toggleTheme}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[var(--elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors ml-2 overflow-hidden shadow-sm"
                title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              >
                <AnimatePresence mode="wait">
                  {isDark ? (
                    <motion.div
                      key="sun"
                      initial={{ y: 20, opacity: 0, rotate: -45 }}
                      animate={{ y: 0, opacity: 1, rotate: 0 }}
                      exit={{ y: -20, opacity: 0, rotate: 45 }}
                      transition={{ duration: 0.2 }}
                      className="absolute"
                    >
                      <Sun size={18} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ y: 20, opacity: 0, rotate: -45 }}
                      animate={{ y: 0, opacity: 1, rotate: 0 }}
                      exit={{ y: -20, opacity: 0, rotate: 45 }}
                      transition={{ duration: 0.2 }}
                      className="absolute"
                    >
                      <Moon size={18} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Wishlist Quick Icon */}
              {user && (
                <Link
                  to="/watchlist"
                  title={watchlist.length > 0 ? `My Wishlist (${watchlist.length} saved)` : 'My Wishlist'}
                  className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[var(--elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-red-400 transition-colors shadow-sm no-underline ml-1"
                >
                  <Heart size={18} className={watchlist.length > 0 ? "fill-red-500 text-red-500" : ""} />
                  {watchlist.length > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.65rem] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                      {watchlist.length}
                    </div>
                  )}
                </Link>
              )}

              {/* Notification Bell */}
              {user && (
                <div className="relative">
                  <motion.button
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[var(--elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-sm"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-[var(--danger)] text-white text-[0.65rem] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                        {unreadCount}
                      </div>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {showNotifDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[130%] right-0 w-[320px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--elevated)]">
                          <h3 className="m-0 text-[0.95rem] font-bold text-[var(--text-main)]">Notifications</h3>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="bg-transparent border-none text-[var(--primary)] text-xs font-semibold cursor-pointer hover:underline">
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="max-h-[350px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <p className="p-8 text-center text-[var(--text-muted)] text-sm m-0">No notifications yet.</p>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} onClick={() => !n.read && markAsRead(n.id)} className={`p-4 border-b border-[var(--border)] cursor-pointer transition-colors ${n.read ? 'bg-transparent' : 'bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20'}`}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-bold text-[var(--text-main)]">{n.title}</span>
                                  {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] m-0 mb-2 leading-relaxed">{n.message}</p>
                                <span className="text-[0.65rem] text-[var(--text-muted)] opacity-80">{new Date(n.created_at).toLocaleString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {user ? (
                <div className="flex items-center gap-3 pl-2 lg:pl-4 xl:border-l border-[var(--border)]">
                  {role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-500/30 transition-all no-underline shadow-sm"
                      title="Admin Dashboard"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline">Admin Dashboard</span>
                    </Link>
                  )}
                  <Link to="/profile" className="no-underline">
                    <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 text-sm text-[var(--text-main)] bg-[var(--elevated)] border border-[var(--border)] py-1.5 px-3 rounded-full cursor-pointer shadow-sm hover:border-[var(--primary)] transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-[var(--text-main)] text-[var(--bg)] flex items-center justify-center font-bold text-xs shrink-0">
                        {user.username ? user.username[0].toUpperCase() : 'U'}
                      </div>
                      <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap font-bold text-sm hidden sm:block">{user.username ?? user.email}</span>
                      <span className="bg-[var(--primary)] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:block">
                        {role}
                      </span>
                    </motion.div>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSignOut}
                    className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--danger)] p-2 rounded-full flex items-center transition-colors shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center gap-3 pl-4 border-l border-[var(--border)] shrink-0">
                  <Link
                    to="/login"
                    className="btn-secondary text-sm"
                  >
                  Log In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[var(--primary-hover)] transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)] no-underline"
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-8 pb-16">
        <div style={centerStyle}>
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--surface)] border-t border-[var(--border)] mt-auto">
        <div style={{ ...centerStyle }} className="py-8 flex justify-between items-center flex-wrap gap-4">
          <p className="text-[var(--text-muted)] text-sm m-0">
            <span className="text-[var(--primary)] font-bold tracking-tight">BidZo</span>
            {' '}© {new Date().getFullYear()} All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[var(--text-muted)] hover:text-[var(--text-main)] no-underline text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-[var(--text-muted)] hover:text-[var(--text-main)] no-underline text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
      <BackToTop />
    </div>
  );
};

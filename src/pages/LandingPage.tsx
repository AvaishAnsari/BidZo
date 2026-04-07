import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence, animate } from 'framer-motion';
import {
  Gavel, Zap, Shield, Clock, TrendingUp, Users,
  ArrowRight, Star, ChevronRight, IndianRupee, Bell,
} from 'lucide-react';
import { useAuctions } from '../hooks/useAuctions';
import { AuctionCard } from '../components/AuctionCard';
import { useTheme } from '../context/ThemeContext';

/* ─── tiny helpers ─────────────────────────────────────────────── */
const centerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '1.5rem',
  paddingRight: '1.5rem',
  width: '100%',
};

const FadeUp = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

/* ─── awesome animated stat component ──────────────────────────── */
const AnimatedStat = ({ num, prefix = '', suffix = '', decimals = 0, isComma = false }: any) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView && ref.current) {
      const controls = animate(0, num, {
        duration: 2.5,
        ease: 'easeOut',
        onUpdate(value) {
          if (ref.current) {
            let displayVal = decimals ? value.toFixed(decimals) : Math.floor(value).toString();
            if (isComma) displayVal = Number(displayVal).toLocaleString();
            ref.current.textContent = prefix + displayVal + suffix;
          }
        }
      });
      return () => controls.stop();
    }
  }, [inView, num, prefix, suffix, decimals, isComma]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
};

/* ─── awesome cursor glow effect ───────────────────────────────── */
const CursorGlow = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 9999, mixBlendMode: 'screen',
        background: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.08), transparent 40%)`,
        transition: 'background 0.1s ease-out'
      }}
    />
  );
};

/* ─── mock live bids ticker ────────────────────────────────────── */
const TICKER_BIDS = [
  { item: 'HMT Janata Watch (1978)', bid: '₹9,500',    user: 'Ravi S.' },
  { item: 'Mughal Miniature Painting', bid: '₹52,000', user: 'Priya K.' },
  { item: 'Royal Enfield Bullet 1965', bid: '₹2,10,000', user: 'Arjun M.' },
  { item: 'Kundan Polki Jewellery Set', bid: '₹1,45,000', user: 'Meera V.' },
  { item: 'M.F. Husain Lithograph',   bid: '₹3,80,000', user: 'Vikram R.' },
];

/* ─── features ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Zap,
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.25)',
    title: 'Real-Time Bidding',
    desc: 'Live price updates the instant someone outbids you — no page refresh needed.',
  },
  {
    icon: Shield,
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.10)',
    border: 'rgba(74,222,128,0.22)',
    title: 'Secure Platform',
    desc: 'Powered by Supabase with RLS policies ensuring every bid is tamper-proof.',
  },
  {
    icon: Clock,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.22)',
    title: 'Anti-Sniping Timer',
    desc: "Last-second bids auto-extend the auction by 30 s — fair for every bidder.",
  },
  {
    icon: Bell,
    color: '#c084fc',
    bg: 'rgba(192,132,252,0.12)',
    border: 'rgba(192,132,252,0.25)',
    title: 'Smart Notifications',
    desc: "Instant alerts when you're outbid or when an auction is about to close.",
  },
  {
    icon: TrendingUp,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.10)',
    border: 'rgba(248,113,113,0.22)',
    title: 'Price Tracking',
    desc: 'Full bid history with timestamps for every auction, visible to all users.',
  },
  {
    icon: IndianRupee,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.22)',
    title: 'Indian Rupee Native',
    desc: 'Built for India — all bids, prices and increments display in ₹ natively.',
  },
];

const STEPS = [
  { n: '1', title: 'Create Account', desc: 'Sign up securely as a buyer or seller via email.', icon: Users },
  { n: '2', title: 'Find Grails', desc: 'Browse our curated gallery of premium auctions.', icon: Star },
  { n: '3', title: 'Place Bids',  desc: 'Engage in real-time, zero-latency bidding wars.', icon: Zap },
  { n: '4', title: 'Win Securely', desc: 'Checkout safely with encrypted payments.', icon: Shield },
];

/* ─── stats ─────────────────────────────────────────────────────── */
const STATS = [
  { num: 500, suffix: '+', label: 'Premium Items', icon: Star },
  { num: 10000, suffix: '+', label: 'Active Bidders', icon: Users, isComma: true },
  { num: 50, prefix: '₹', suffix: ' Cr+', label: 'Total Bids Placed', icon: IndianRupee },
  { num: 99.9, suffix: '%', decimals: 1, label: 'Uptime Guarantee', icon: Shield },
];

/* ─── dynamic headings ─────────────────────────────────────────── */
const HEADINGS = ['Live Auctions', 'Rare Grails', 'Vintage Art', 'Rolex Watches'];

/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════════ */
export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { auctions } = useAuctions();
  const { isDark } = useTheme();
  
  const [tickerIdx, setTickerIdx] = useState(0);
  const [headingIdx, setHeadingIdx] = useState(0);

  const liveAuctions = auctions.filter(a => a.status === 'live').slice(0, 3);
  const displayAuctions = liveAuctions.length >= 3 ? liveAuctions : auctions.slice(0, 3);

  // Auto-advance ticker
  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_BIDS.length), 3200);
    return () => clearInterval(t);
  }, []);

  // Auto-advance heading
  useEffect(() => {
    const t = setInterval(() => setHeadingIdx(i => (i + 1) % HEADINGS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // If already logged in, still show landing but CTA routes to /auctions
  const handleGetStarted = () => navigate(user ? '/auctions' : '/login');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <CursorGlow />

      {/* ════ NAVBAR ════════════════════════════════════════════════ */}
      <header
        className="glass"
        style={{ position: 'sticky', top: '-1px', paddingTop: '1px', margin: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div style={centerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '72px' }}>

            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  padding: '0.6rem', borderRadius: '0.75rem',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                }}
              >
                <Gavel style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
              </motion.div>
              <span style={{
                fontSize: '1.5rem', fontWeight: 800,
                background: isDark ? 'linear-gradient(to right, #ffffff, #a5b4fc)' : 'linear-gradient(to right, #4f46e5, #7e22ce)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', letterSpacing: '-0.02em',
              }}>
                BidZo
              </span>
            </Link>

            {/* Nav actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user ? (
                <>
                  <Link
                    to="/auctions"
                    className="btn-gradient"
                    style={{ textDecoration: 'none', padding: '0.6rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    Enter App <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    style={{
                      color: isDark ? '#9ca3af' : '#4b5563', fontWeight: 500, textDecoration: 'none',
                      padding: '0.5rem 1rem', borderRadius: '0.75rem', fontSize: '0.95rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = isDark ? 'white' : '#111827')}
                    onMouseOut={(e) => (e.currentTarget.style.color = isDark ? '#9ca3af' : '#4b5563')}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="btn-gradient"
                    style={{ textDecoration: 'none', fontSize: '0.95rem', padding: '0.6rem 1.5rem', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════ LIVE TICKER BAR ═══════════════════════════════════════ */}
      <div style={{
        background: isDark ? 'linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.12) 100%)' : 'rgba(249,250,251,1)',
        borderBottom: isDark ? '1px solid rgba(99,102,241,0.15)' : '1px solid #e5e7eb',
        padding: '0.5rem 0',
        overflow: 'hidden',
      }}>
        <div style={centerStyle}>
          <motion.div
            key={tickerIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem' }}
          >
            <span style={{
              background: isDark ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))' : '#10b981',
              color: isDark ? '#4ade80' : '#ffffff', border: isDark ? '1px solid rgba(34,197,94,0.35)' : 'none',
              borderRadius: '9999px', padding: '0.1rem 0.55rem',
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
            }}>● LIVE</span>
            <span style={{ color: isDark ? '#6b7280' : '#4b5563' }}>Latest bid:</span>
            <span style={{ color: isDark ? '#e5e7eb' : '#111827', fontWeight: 600 }}>
              {TICKER_BIDS[tickerIdx].item}
            </span>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>
              {TICKER_BIDS[tickerIdx].bid}
            </span>
            <span style={{ color: isDark ? '#4b5563' : '#6b7280' }}>by {TICKER_BIDS[tickerIdx].user}</span>
          </motion.div>
        </div>
      </div>

      {/* ════ HERO ══════════════════════════════════════════════════ */}
      <section style={{ 
        position: 'relative', 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '6rem 1.5rem',
        overflow: 'hidden' 
      }}>
        {/* Deep Glowing Premium Backgrounds */}
        <div style={{
          position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.15), transparent 60%)',
          filter: 'blur(100px)', zIndex: 0
        }} />
        <div style={{
          position: 'absolute', top: '10%', left: '10%', width: '30vw', height: '30vw', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)',
          filter: 'blur(80px)', zIndex: 0
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '10%', width: '30vw', height: '30vw', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)',
          filter: 'blur(80px)', zIndex: 0
        }} />

        {/* Floating Ambient Circles */}
        <motion.div animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', top: '15%', left: '20%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', filter: 'blur(30px)' }} />
        <motion.div animate={{ y: [0, 40, 0], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', top: '65%', right: '15%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', filter: 'blur(40px)' }} />

        <div style={{ maxWidth: '1200px', width: '100%', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* Live Indicator Dot */}
          <FadeUp delay={0.05}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(34,197,94,0.08)', padding: '0.35rem 1rem', borderRadius: '9999px', border: '1px solid rgba(34,197,94,0.25)', marginBottom: '1.5rem', backdropFilter: 'blur(10px)' }}>
              <div className="pulse-live" style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4ade80', letterSpacing: '0.08em' }}>LIVE AUCTIONS RUNNING</span>
            </div>
          </FadeUp>

          {/* Badge */}
          <FadeUp delay={0.1}>
            <div
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                margin: '0 auto 2rem', padding: '0.5rem 1.25rem',
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(139,92,246,0.08)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(139,92,246,0.2)',
                backdropFilter: 'blur(16px)',
                borderRadius: '9999px',
                color: isDark ? '#e2e8f0' : '#6d28d9', fontSize: '0.875rem', fontWeight: 600,
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 2px 10px rgba(139,92,246,0.1)'
              }}
            >
              <Zap style={{ width: '1rem', height: '1rem', color: '#c084fc' }} />
              India's Premier Real-Time Auction Platform
            </div>
          </FadeUp>

          {/* H1 */}
          <FadeUp delay={0.2}>
            <h1
              style={{
                margin: '0 auto 1.5rem',
                fontWeight: 900,
                letterSpacing: '-0.05em',
                lineHeight: 1.1,
                maxWidth: '1000px',
              }}
            >
              <span style={{ color: isDark ? '#f8fafc' : '#111827', display: 'block', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
                Discover Premium
              </span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={headingIdx}
                  initial={{ y: 30, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -30, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="gradient-text"
                  style={{ display: 'inline-block', fontSize: 'clamp(3rem, 8vw, 6.5rem)', padding: '0.2em 0' }}
                >
                  {HEADINGS[headingIdx]}
                </motion.span>
              </AnimatePresence>
            </h1>
          </FadeUp>

          {/* Sub-heading */}
          <FadeUp delay={0.4}>
            <p
              style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                color: isDark ? '#94a3b8' : '#374151',
                maxWidth: '650px',
                margin: '0 auto 3rem',
                lineHeight: 1.7,
                fontWeight: 400,
              }}
            >
              Bid on rare antiques, art, and exquisite pieces — with real-time prices,
              bank-grade security, and built-in anti-sniping protection.
            </p>
          </FadeUp>

          {/* CTA buttons */}
          <FadeUp delay={0.6}>
            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  fontSize: '1.05rem', fontWeight: 600, padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #7e22ce 0%, #4f46e5 100%)',
                  color: 'white', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 10px 30px -5px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                  cursor: 'pointer', transition: 'box-shadow 0.3s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.boxShadow = '0 20px 40px -5px rgba(168,85,247,0.6), inset 0 1px 0 rgba(255,255,255,0.3)')}
                onMouseOut={(e) => (e.currentTarget.style.boxShadow = '0 10px 30px -5px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.2)')}
              >
                Get Started Free
                <ArrowRight style={{ width: '1.2rem', height: '1.2rem' }} />
              </motion.button>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/auctions"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '1rem 2.5rem',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d5db',
                    borderRadius: '1rem',
                    color: isDark ? '#e2e8f0' : '#374151', fontWeight: 600, fontSize: '1.05rem',
                    textDecoration: 'none',
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s',
                    boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#f9fafb';
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db';
                  }}
                >
                  Explore Auctions
                  <ChevronRight style={{ width: '1.2rem', height: '1.2rem' }} />
                </Link>
              </motion.div>
            </div>
          </FadeUp>
          
          {/* Trust strip */}
          <FadeUp delay={0.8}>
            <p style={{ marginTop: '3rem', fontSize: '0.85rem', color: isDark ? '#64748b' : '#6b7280', fontWeight: 500 }}>
              No credit card required · Instant setup · Bank-grade security
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ════ BLURRED PREVIEW OVERLAY ═══════════════════════════════ */}
      <section style={{ position: 'relative', marginTop: '-5rem', paddingBottom: '5rem', zIndex: 10 }}>
        <FadeUp delay={0.9}>
          <div style={{ ...centerStyle, display: 'flex', justifyContent: 'center' }}>
            <motion.div 
              initial="initial" whileHover="hover"
              style={{
                width: '100%', maxWidth: '1000px', height: '360px',
                background: 'linear-gradient(180deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1.5rem',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                overflow: 'hidden', position: 'relative', padding: '1.5rem',
                cursor: 'pointer'
              }}
              onClick={handleGetStarted}
            >
              {/* Real Data UI Mockup */}
              <motion.div 
                variants={{
                  initial: { filter: 'blur(3px) saturate(80%)', opacity: 0.65, scale: 0.98 },
                  hover:   { filter: 'blur(0px) saturate(100%)', opacity: 1, scale: 1 }
                }}
                transition={{ duration: 0.4 }}
                style={{ display: 'flex', gap: '1.5rem', pointerEvents: 'none', justifyContent: 'center', width: '100%' }}
              >
                {displayAuctions.length > 0 ? (
                  displayAuctions.map(auction => (
                    <div key={auction.id} style={{ width: '280px', flexShrink: 0 }}>
                      <AuctionCard auction={auction} />
                    </div>
                  ))
                ) : (
                  [1, 2, 3].map(i => (
                    <div key={i} style={{ width: '280px', height: '300px', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem' }}>
                      <div style={{ width: '100%', height: '160px', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', marginBottom: '1rem' }} />
                      <div style={{ width: '80%', height: '1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.2rem', marginBottom: '0.5rem' }} />
                      <div style={{ width: '50%', height: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.2rem' }} />
                    </div>
                  ))
                )}
              </motion.div>
              
              {/* CTA Overlay */}
              <motion.div 
                variants={{
                  initial: { background: 'linear-gradient(180deg, transparent 0%, #030712 90%)' },
                  hover:   { background: 'linear-gradient(180deg, transparent 0%, rgba(3,7,18,0.5) 90%)' }
                }}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                  paddingBottom: '3rem', pointerEvents: 'none'
                }}>
                <button 
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)', color: 'white', padding: '0.75rem 2.5rem',
                    borderRadius: '9999px', fontSize: '1rem', fontWeight: 600,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.3)',
                  }}
                >
                  View Live Gallery
                </button>
              </motion.div>
            </motion.div>
          </div>
        </FadeUp>
      </section>

      {/* ════ STATS ════════════════════════════════════════════════ */}
      <section style={{ padding: '2rem 0 6rem 0' }}>
        <div style={{ ...centerStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {STATS.map(({ num, prefix, suffix, decimals, isComma, label, icon: Icon }, i) => (
            <FadeUp key={label} delay={i * 0.1}>
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                style={{ 
                  textAlign: 'center', 
                  background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                  backdropFilter: 'blur(16px)',
                  border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e5e7eb',
                  borderRadius: '1.5rem',
                  padding: '2rem 1.5rem',
                  boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 25px rgba(0,0,0,0.07)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div style={{ background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(139,92,246,0.1)', padding: '0.75rem', borderRadius: '1rem' }}>
                    <Icon style={{ width: '1.75rem', height: '1.75rem', color: '#818cf8' }} />
                  </div>
                </div>
                <div style={{
                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                  fontWeight: 900, letterSpacing: '-0.03em',
                  background: isDark ? 'linear-gradient(135deg, #e0e7ff, #a5b4fc)' : 'linear-gradient(135deg, #7e22ce, #4f46e5)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  <AnimatedStat num={num} prefix={prefix} suffix={suffix} decimals={decimals} isComma={isComma} />
                </div>
                <div style={{ fontSize: '0.95rem', color: isDark ? '#94a3b8' : '#4b5563', marginTop: '0.5rem', fontWeight: 500 }}>{label}</div>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════ FEATURES ══════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 0' }}>
        <div style={centerStyle}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div className="section-label" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
                <Star style={{ width: '0.85rem', height: '0.85rem' }} />
                Platform Features
              </div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: 800, letterSpacing: '-0.03em',
                color: isDark ? '#f8fafc' : '#111827', margin: '0 0 1rem',
              }}>
                Everything you need to{' '}
                <span className="gradient-text">win auctions</span>
              </h2>
              <p style={{ color: isDark ? '#6b7280' : '#374151', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
                BidZo is packed with tools that make bidding fast, safe, and transparent.
              </p>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(({ icon: Icon, color, bg, border, title, desc }, i) => (
              <FadeUp key={title} delay={i * 0.07}>
                <motion.div
                  whileHover={{ translateY: -4 }}
                  className="glass-card"
                  style={{ borderRadius: '1.25rem', padding: '1.75rem' }}
                >
                  <div style={{
                    width: '2.8rem', height: '2.8rem', borderRadius: '0.9rem',
                    background: bg, border: `1px solid ${border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.1rem',
                    boxShadow: `0 0 16px ${color}22`,
                  }}>
                    <Icon style={{ width: '1.25rem', height: '1.25rem', color }} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#e5e7eb' : '#111827', marginBottom: '0.5rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.875rem', color: isDark ? '#6b7280' : '#374151', lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ════ HOW IT WORKS ══════════════════════════════════════════ */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(180deg, transparent 0%, rgba(15,10,40,0.5) 50%, transparent 100%)',
      }}>
        <div style={centerStyle}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div className="section-label" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
                <ChevronRight style={{ width: '0.85rem', height: '0.85rem' }} />
                How It Works
              </div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: 800, letterSpacing: '-0.03em',
                color: isDark ? '#f8fafc' : '#111827', margin: 0,
              }}>
                Start bidding in{' '}
                <span className="gradient-text">4 simple steps</span>
              </h2>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', position: 'relative' }}>
            {/* Connecting line (desktop only) */}
            <div style={{
              position: 'absolute', top: '3.5rem', left: '12%', right: '12%',
              height: '1px', pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5) 20%, rgba(168,85,247,0.5) 80%, transparent)',
            }} />

            {STEPS.map(({ n, title, desc, icon: Icon }, i) => (
              <FadeUp key={n} delay={i * 0.15}>
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  {/* Step number and icon */}
                  <div style={{
                    width: '7rem', height: '7rem', borderRadius: '50%',
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e5e7eb',
                    boxShadow: isDark ? '0 0 40px rgba(99,102,241,0.1), inset 0 0 20px rgba(255,255,255,0.02)' : '0 8px 20px rgba(0,0,0,0.08)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem', position: 'relative', backdropFilter: 'blur(10px)',
                  }}>
                    <div style={{
                      position: 'absolute', top: '-0.5rem', right: '-0.5rem',
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 800, color: 'white',
                      boxShadow: '0 0 15px rgba(168,85,247,0.5)',
                    }}>
                      {n}
                    </div>
                    <Icon style={{ width: '2rem', height: '2rem', color: '#818cf8', marginBottom: '0.25rem' }} />
                  </div>
                  
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: isDark ? '#e2e8f0' : '#111827', marginBottom: '0.6rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.9rem', color: isDark ? '#94a3b8' : '#374151', lineHeight: 1.6, maxWidth: '240px', margin: '0 auto' }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ════ CTA BAND ══════════════════════════════════════════════ */}
      <section style={{ padding: '5rem 0' }}>
        <div style={centerStyle}>
          <FadeUp>
            <div
              className="glass-card"
              style={{
                borderRadius: '2rem',
                padding: 'clamp(2.5rem, 5vw, 4rem)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              {/* Internal glow */}
              <div style={{
                position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
                width: '600px', height: '300px', pointerEvents: 'none',
                background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 70%)',
              }} />

              <div className="section-label" style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
                <Gavel style={{ width: '0.85rem', height: '0.85rem' }} />
                Ready to Bid?
              </div>

              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 3rem)',
                fontWeight: 900, letterSpacing: '-0.035em', color: isDark ? '#f8fafc' : '#111827',
                margin: '0 auto 1rem', maxWidth: '600px',
              }}>
                Join <span className="gradient-text">10,000+ bidders</span> competing right now
              </h2>

              <p style={{
                color: isDark ? '#6b7280' : '#374151', fontSize: '1rem', lineHeight: 1.75,
                maxWidth: '440px', margin: '0 auto 2.5rem',
              }}>
                Create your free account in under 60 seconds and start bidding on
                India's most exclusive online auction platform.
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGetStarted}
                  className="btn-gradient"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.9rem 2.25rem' }}
                >
                  {user ? 'Go to Auctions' : 'Create Free Account'}
                  <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                </motion.button>
                {!user && (
                  <Link
                    to="/login"
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '0.9rem 2rem',
                      border: isDark ? '1px solid rgba(55,65,81,0.6)' : '1px solid #d1d5db',
                      borderRadius: '0.875rem',
                      color: isDark ? '#9ca3af' : '#374151', fontWeight: 600, fontSize: '1rem',
                      textDecoration: 'none', background: isDark ? 'rgba(17,24,39,0.4)' : '#ffffff',
                      transition: 'all 0.2s',
                      boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    Already have an account? Sign in
                  </Link>
                )}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ════ FOOTER ════════════════════════════════════════════════ */}
      <footer
        className="glass"
        style={{ borderTop: '1px solid rgba(55,65,81,0.4)', marginTop: 'auto' }}
      >
        <div style={{
          ...centerStyle,
          paddingTop: '1.75rem', paddingBottom: '1.75rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Gavel style={{ width: '1.1rem', height: '1.1rem', color: '#6366f1' }} />
            <span style={{ color: '#6366f1', fontWeight: 700, fontSize: '1rem' }}>BidZo</span>
            <span style={{ color: '#4b5563', fontSize: '0.85rem' }}>
              © {new Date().getFullYear()} All rights reserved.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Privacy Policy', 'Terms of Service', 'Contact'].map(lbl => (
              <a key={lbl} href="#" style={{ color: '#4b5563', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }}>
                {lbl}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

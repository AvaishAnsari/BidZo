import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Flame, Zap, Shield, Clock, TrendingUp, Users,
  ArrowRight, Star, ChevronRight, IndianRupee, Bell,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import BrandMark from '../components/BrandMark';

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
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26, filter: 'blur(5px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  );
};

const BeadArtwork = () => {
  const colors = ['#9f4339', '#c9974e', '#dfc483', '#526b4b', '#d7a957', '#7a302f'];
  const beads = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2 - Math.PI / 2;
    return { x: 200 + Math.cos(angle) * 132, y: 190 + Math.sin(angle) * 145, color: colors[index % colors.length] };
  });

  return (
    <motion.div
      className="hero-artwork"
      initial={{ opacity: 0, scale: 0.88, rotate: 4 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.svg
        className="hero-bead-strand"
        viewBox="0 0 400 380"
        role="img"
        aria-label="A handcrafted strand of colorful beads"
        animate={{ y: [0, -7, 0], rotate: [0, 1.5, 0, -1.5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <radialGradient id="beadHighlight" cx="30%" cy="25%">
            <stop offset="0%" stopColor="#fff6dd" stopOpacity=".92" />
            <stop offset="35%" stopColor="#fff6dd" stopOpacity=".1" />
            <stop offset="100%" stopColor="#1f130d" stopOpacity=".42" />
          </radialGradient>
          <linearGradient id="strand" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#edcd8a" />
            <stop offset="1" stopColor="#8f6031" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="190" rx="132" ry="145" fill="none" stroke="url(#strand)" strokeWidth="3" opacity=".7" />
        {beads.map((bead, index) => (
          <g key={index}>
            <circle cx={bead.x} cy={bead.y} r={index % 4 === 0 ? 17 : 14} fill={bead.color} stroke="#e1bd79" strokeWidth="2" />
            <circle cx={bead.x} cy={bead.y} r={index % 4 === 0 ? 17 : 14} fill="url(#beadHighlight)" />
          </g>
        ))}
        <circle cx="200" cy="190" r="46" fill="#3b261d" stroke="#d4aa5f" strokeWidth="2" />
        <path d="M200 154l12 19 22 5-15 16 2 22-21-10-21 10 2-22-15-16 22-5z" fill="#c08a49" stroke="#f0d9ae" strokeWidth="2" />
        <circle cx="200" cy="190" r="6" fill="#fff0cb" />
      </motion.svg>
      <motion.span className="hero-floating-label top" animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>Made by hand</motion.span>
      <motion.span className="hero-floating-label bottom" animate={{ y: [0, 5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>Every bead tells a story</motion.span>
    </motion.div>
  );
};

/* ─── features ─────────────────────────────────────────────────── */
const FEATURE_KEYS = [
  { icon: Zap,         color: '#d8af68', bg: 'rgba(190,143,70,0.12)',  border: 'rgba(190,143,70,0.25)',  titleKey: 'realTimeBidding',    descKey: 'realTimeBiddingDesc' },
  { icon: Shield,      color: '#879b70', bg: 'rgba(135,155,112,0.10)', border: 'rgba(135,155,112,0.22)', titleKey: 'securePlatform',     descKey: 'securePlatformDesc' },
  { icon: Clock,       color: '#c17a56', bg: 'rgba(193,122,86,0.10)',  border: 'rgba(193,122,86,0.22)',  titleKey: 'antiSnipingTimer',   descKey: 'antiSnipingTimerDesc' },
  { icon: Bell,        color: '#d8af68', bg: 'rgba(216,175,104,0.12)', border: 'rgba(216,175,104,0.25)', titleKey: 'smartNotifications', descKey: 'smartNotificationsDesc' },
  { icon: TrendingUp,  color: '#a34b3d', bg: 'rgba(163,75,61,0.10)',   border: 'rgba(163,75,61,0.22)',   titleKey: 'priceTracking',      descKey: 'priceTrackingDesc' },
  { icon: IndianRupee, color: '#b58a4a', bg: 'rgba(181,138,74,0.10)', border: 'rgba(181,138,74,0.22)', titleKey: 'indianRupeeNative',  descKey: 'indianRupeeNativeDesc' },
];

const STEP_KEYS = [
  { n: '1', titleKey: 'createAccount', descKey: 'createAccountDesc', icon: Users },
  { n: '2', titleKey: 'findGrails',    descKey: 'findGrailsDesc',    icon: Star },
  { n: '3', titleKey: 'placeBidsStep', descKey: 'placeBidsStepDesc', icon: Zap },
  { n: '4', titleKey: 'winSecurely',   descKey: 'winSecurelyDesc',   icon: Shield },
];

/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════════ */
export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  
  // Browsing is public; an account is only needed for bidding or listing.
  const handleGetStarted = () => navigate(user ? '/auctions' : '/register');

  return (
    <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      {/* ════ NAVBAR ════════════════════════════════════════════════ */}
      <header
        className="glass landing-header"
        style={{ position: 'sticky', top: '-1px', paddingTop: '1px', margin: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div style={centerStyle}>
          <div className="landing-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '72px' }}>

            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'linear-gradient(135deg, #8e5f2d, #d5b269)',
                  padding: '0.6rem', borderRadius: '0.75rem',
                  boxShadow: '0 8px 24px rgba(157,108,48,0.35)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                }}
              >
                <BrandMark size={26} />
              </motion.div>
              <span style={{
                fontSize: '1.5rem', fontWeight: 800,
                background: isDark ? 'linear-gradient(to right, #fffaf0, #d9b770)' : 'linear-gradient(to right, #805329, #a34b3d)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', letterSpacing: '-0.02em',
              }}>
                BidZo
              </span>
            </Link>

            {/* Nav actions */}
            <div className="landing-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                    style={{ textDecoration: 'none', fontSize: '0.95rem', padding: '0.6rem 1.5rem', boxShadow: '0 10px 24px rgba(157,108,48,0.24)' }}
                  >
                    {t('getStarted')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════ HERO ══════════════════════════════════════════════════ */}
      <motion.section
        className="landing-hero"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
      >
        <motion.div
          className="landing-hero-inner"
          variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="section-label" style={{ marginBottom: '1.25rem' }}>
            <Star style={{ width: '0.95rem', height: '0.95rem', color: '#d8af68' }} />
            Beadwork · Artisan finds · Live auctions
          </div>
          <h1>
            <span>Made to be</span>
            <span className="gradient-text">treasured.</span>
          </h1>
          <p>Discover handmade beadwork and one-of-a-kind finds. Meet the makers, follow every bid, and bring home a piece with a story.</p>
          <div className="landing-hero-actions">
            <Link to="/auctions" className="btn-gradient">
              Explore the collection <ArrowRight size={18} />
            </Link>
            <button className="landing-secondary-action" onClick={handleGetStarted}>
              {user ? 'Go to auctions' : 'Join BidZo'} <ChevronRight size={18} />
            </button>
          </div>
          <span className="landing-hero-note">A thoughtful marketplace for makers, collectors, and curious minds.</span>
        </motion.div>
        <BeadArtwork />
      </motion.section>

      {/* ════ FEATURES ══════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 0' }}>
        <div style={centerStyle}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div className="section-label" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
                <Star style={{ width: '0.85rem', height: '0.85rem' }} />
                {t('platformFeatures')}
              </div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: 800, letterSpacing: '-0.03em',
                color: isDark ? '#f8fafc' : '#111827', margin: '0 0 1rem',
              }}>
                {t('everythingYouNeed')}{' '}
                <span className="gradient-text">{t('winAuctions')}</span>
              </h2>
              <p style={{ color: isDark ? '#6b7280' : '#374151', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
                {t('featuresSubtext')}
              </p>
            </div>
          </FadeUp>

          <div className="auction-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {FEATURE_KEYS.map(({ icon: Icon, color, bg, border, titleKey, descKey }, i) => (
              <FadeUp key={titleKey} delay={i * 0.07}>
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#e5e7eb' : '#111827', marginBottom: '0.5rem' }}>{t(titleKey)}</h3>
                  <p style={{ fontSize: '0.875rem', color: isDark ? '#6b7280' : '#374151', lineHeight: 1.65, margin: 0 }}>{t(descKey)}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ════ HOW IT WORKS ══════════════════════════════════════════ */}
      <section style={{
        padding: '6rem 0',
        background: 'linear-gradient(180deg, transparent 0%, rgba(190,143,70,0.07) 50%, transparent 100%)',
      }}>
        <div style={centerStyle}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <div className="section-label" style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
                <ChevronRight style={{ width: '0.85rem', height: '0.85rem' }} />
                {t('howItWorks')}
              </div>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: 800, letterSpacing: '-0.03em',
                color: isDark ? '#f8fafc' : '#111827', margin: 0,
              }}>
                {t('startBiddingIn')}{' '}
                <span className="gradient-text">{t('simpleSteps')}</span>
              </h2>
            </div>
          </FadeUp>

          <div className="landing-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', position: 'relative' }}>
            {/* Connecting line (desktop only) */}
            <div style={{
              position: 'absolute', top: '3.5rem', left: '12%', right: '12%',
              height: '1px', pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent, rgba(190,143,70,0.55) 20%, rgba(213,178,105,0.55) 80%, transparent)',
            }} />

            {STEP_KEYS.map(({ n, titleKey, descKey, icon: Icon }, i) => (
              <FadeUp key={n} delay={i * 0.15}>
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  {/* Step number and icon */}
                  <div style={{
                    width: '7rem', height: '7rem', borderRadius: '50%',
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e5e7eb',
                    boxShadow: isDark ? '0 0 40px rgba(190,143,70,0.14), inset 0 0 20px rgba(255,255,255,0.02)' : '0 8px 20px rgba(75,53,26,0.1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem', position: 'relative', backdropFilter: 'blur(10px)',
                  }}>
                    <div style={{
                      position: 'absolute', top: '-0.5rem', right: '-0.5rem',
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #9f6b32 0%, #d0aa62 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 800, color: 'white',
                      boxShadow: '0 0 15px rgba(190,143,70,0.4)',
                    }}>
                      {n}
                    </div>
                    <Icon style={{ width: '2rem', height: '2rem', color: '#c49b5a', marginBottom: '0.25rem' }} />
                  </div>
                  
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: isDark ? '#e2e8f0' : '#111827', marginBottom: '0.6rem' }}>{t(titleKey)}</h3>
                  <p style={{ fontSize: '0.9rem', color: isDark ? '#94a3b8' : '#374151', lineHeight: 1.6, maxWidth: '240px', margin: '0 auto' }}>{t(descKey)}</p>
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
                border: '1px solid rgba(190,143,70,0.3)',
              }}
            >
              {/* Internal glow */}
              <div style={{
                position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
                width: '600px', height: '300px', pointerEvents: 'none',
                background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(190,143,70,0.18) 0%, transparent 70%)',
              }} />

              <div className="section-label" style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
                <Flame style={{ width: '0.85rem', height: '0.85rem' }} />
                {t('readyToBid')}
              </div>

              <h2 style={{
                fontSize: 'clamp(1.75rem, 4vw, 3rem)',
                fontWeight: 900, letterSpacing: '-0.035em', color: isDark ? '#f8fafc' : '#111827',
                margin: '0 auto 1rem', maxWidth: '600px',
              }}>
                {t('discoverPremium')} <span className="gradient-text">{t('liveAuctions')}</span>
              </h2>

              <p style={{
                color: isDark ? '#6b7280' : '#374151', fontSize: '1rem', lineHeight: 1.75,
                maxWidth: '440px', margin: '0 auto 2.5rem',
              }}>
                {t('ctaSubtext')}
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGetStarted}
                  className="btn-gradient"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.9rem 2.25rem' }}
                >
                  {user ? t('goToAuctions') : t('createFreeAccount')}
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
                    {t('alreadyHaveAccount')}
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
            <Flame style={{ width: '1.1rem', height: '1.1rem', color: '#9a672e' }} />
            <span style={{ color: '#9a672e', fontWeight: 700, fontSize: '1rem' }}>BidZo</span>
            <span style={{ color: '#4b5563', fontSize: '0.85rem' }}>
              © {new Date().getFullYear()} All rights reserved.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {([['privacyPolicy', t('privacyPolicy')], ['termsOfService', t('termsOfService')], ['contact', t('contact')]] as [string,string][]).map(([key, lbl]) => (
              <a key={key} href="#" style={{ color: '#4b5563', textDecoration: 'none', fontSize: '0.85rem', transition: 'color 0.2s' }}>
                {lbl}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

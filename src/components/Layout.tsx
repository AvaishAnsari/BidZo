import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gavel, LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const centerStyle: React.CSSProperties = {
  maxWidth: '1280px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '1.5rem',
  paddingRight: '1.5rem',
  width: '100%',
};

export const Layout = () => {
  const { user, userRole, userName, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Auctions', path: '/auctions' },
    ...(user ? [{ name: 'Watchlist', path: '/watchlist' }] : []),
    ...(userRole === 'seller' ? [{ name: 'Create Auction', path: '/create-auction' }] : [])
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Navigation */}
      <header className="glass" style={{ position: 'sticky', top: '-1px', paddingTop: '1px', margin: 0, zIndex: 50 }}>
        <div style={centerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '72px' }}>
            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  padding: '0.6rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                }}
              >
                <Gavel style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
              </motion.div>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                background: 'linear-gradient(to right, #f1f5f9, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}>
                BidZo
              </span>
            </Link>

            {/* Nav Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    style={{
                      position: 'relative',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      textDecoration: 'none',
                      color: isActive ? '#818cf8' : '#9ca3af',
                      paddingBottom: '0.25rem',
                      transition: 'color 0.2s',
                    }}
                  >
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: '#6366f1',
                          borderRadius: '9999px',
                        }}
                        initial={false}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </Link>
                );
              })}

              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1.5rem', borderLeft: '1px solid rgba(55,65,81,0.6)' }}>
                  <Link to="/profile" style={{ textDecoration: 'none' }}>
                    <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      color: '#d1d5db',
                      background: 'rgba(31,41,55,0.6)',
                      border: '1px solid rgba(55,65,81,0.5)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                    }}>
                      <UserIcon style={{ width: '1rem', height: '1rem', color: '#818cf8' }} />
                      <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName ?? user.email}</span>
                      <span style={{
                        background: 'rgba(99,102,241,0.2)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99,102,241,0.3)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {userRole}
                      </span>
                    </motion.div>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSignOut}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      padding: '0.5rem',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
                    title="Sign Out"
                  >
                    <LogOut style={{ width: '1.25rem', height: '1.25rem' }} />
                  </motion.button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.5rem', borderLeft: '1px solid rgba(55,65,81,0.6)' }}>
                  <Link
                    to="/login"
                    style={{
                      color: '#9ca3af',
                      fontWeight: 500,
                      textDecoration: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.75rem',
                      border: '1px solid transparent',
                      transition: 'all 0.2s',
                      fontSize: '0.9rem',
                    }}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    style={{
                      background: '#4f46e5',
                      color: 'white',
                      fontWeight: 600,
                      textDecoration: 'none',
                      padding: '0.55rem 1.25rem',
                      borderRadius: '0.75rem',
                      fontSize: '0.9rem',
                      border: '1px solid rgba(99,102,241,0.3)',
                      boxShadow: '0 0 15px rgba(99,102,241,0.3)',
                      transition: 'all 0.2s',
                    }}
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
      <main style={{ flex: 1, paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={centerStyle}>
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="glass" style={{ borderTop: '1px solid rgba(55,65,81,0.4)', marginTop: 'auto' }}>
        <div style={{ ...centerStyle, paddingTop: '2rem', paddingBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
            <span style={{ color: '#6366f1', fontWeight: 600 }}>BidZo</span>
            {' '}© {new Date().getFullYear()} All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Privacy Policy</a>
            <a href="#" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

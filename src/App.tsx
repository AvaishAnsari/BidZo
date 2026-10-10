import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CreateAuction } from './pages/CreateAuction';
import { AuctionDetail } from './pages/AuctionDetail';
import { WatchlistPage } from './pages/WatchlistPage';
import { ProfilePage } from './pages/Profile';
import { AccountDetailsPage } from './pages/AccountDetails';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { syncServerTime } from './utils/timeSync';
import { useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

function App() {
  const { i18n } = useTranslation();
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  useEffect(() => {
    syncServerTime();
  }, []);

  return (
    <ThemeProvider>
      <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
        <AuthProvider>
          <NotificationProvider>
          <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(17,24,39,0.95)',
              color: '#f9fafb',
              border: '1px solid rgba(55,65,81,0.6)',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
        <Routes>
          {/* ── Public landing (no Layout wrapper) ── */}
          <Route index element={<LandingPage />} />

          {/* ── Auth pages (full-screen, no Layout wrapper) ── */}
          <Route path="login"       element={<Login />} />
          <Route path="register"    element={<Register />} />

          {/* ── App shell (Layout = navbar + footer) ── */}
          <Route element={<Layout />}>

            {/* Auction browsing is public; sign-in is required only for account actions. */}
            <Route path="auctions" element={<Home />} />
            <Route path="auction/:id" element={<AuctionDetail />} />

            {/* Account pages require a signed-in member. */}
            <Route element={<ProtectedRoute />}>
              <Route path="watchlist"     element={<WatchlistPage />} />
              <Route path="profile"       element={<ProfilePage />} />
              <Route path="profile/details" element={<AccountDetailsPage />} />
            </Route>

            {/* Any signed-in member can bid and create auctions. */}
            <Route element={<ProtectedRoute />}>
              <Route path="create-auction" element={<CreateAuction />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
          </Route>
        </Routes>
      </Router>
      </NotificationProvider>
      </AuthProvider>
      </GoogleReCaptchaProvider>
    </ThemeProvider>
  );
}

export default App;

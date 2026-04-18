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
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SupabaseStatus } from './components/SupabaseStatus';
import { syncServerTime } from './utils/timeSync';
import { useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { useTranslation } from 'react-i18next';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  useEffect(() => {
    syncServerTime();
  }, []);

  return (
    <ThemeProvider>
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
        <SupabaseStatus />
        <Routes>
          {/* ── Public landing (no Layout wrapper) ── */}
          <Route index element={<LandingPage />} />

          {/* ── App shell (Layout = navbar + footer) ── */}
          <Route element={<Layout />}>
            <Route path="login"    element={<Login />} />
            <Route path="register" element={<Register />} />

            {/* Any logged-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="auctions"      element={<Home />} />
              <Route path="auction/:id"   element={<AuctionDetail />} />
              <Route path="watchlist"     element={<WatchlistPage />} />
              <Route path="profile"       element={<ProfilePage />} />
            </Route>

            {/* Sellers only */}
            <Route element={<ProtectedRoute requiredRole="seller" />}>
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
    </ThemeProvider>
  );
}

export default App;

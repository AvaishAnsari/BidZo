/**
 * ProtectedRoute.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates routes securely using local state flags.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: 'buyer' | 'seller' | 'admin';
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();

  // Show a blank placeholder loading state while your browser checks storage fields
  if (loading) {
    return <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>Verifying security credentials...</div>;
  }

  // Kick out unauthenticated users back to the authentication panel
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Direct administrators anywhere, or restrict routes if a specific user role isn't met
  if (requiredRole && role !== 'admin' && role !== requiredRole) {
    return <Navigate to="/auctions" replace />;
  }

  return <Outlet />;
}

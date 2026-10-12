import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

import type { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { user, isLoading, userRole } = useAuth();
  const location = useLocation();

  // Show spinner while session is being restored
  if (isLoading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
      }}>
        <Loader2 style={{ width: '2rem', height: '2rem', color: '#8b5e2c', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#6b7280', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          Loading…
        </p>
      </div>
    );
  }

  // Not logged in → send to login, remember where they were going
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role restrictions are only used for privileged areas such as admin.
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/auctions" replace />;
  }

  return <Outlet />;
};

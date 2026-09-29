/**
 * AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrated from Supabase Auth observer to local Django session tracking.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const refreshUser = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Default to admin or seller based on username for easy testing, or fall back to seller
        setRole(parsedUser.username === 'rahu' ? 'admin' : (parsedUser.role || 'seller'));
      } catch (e) {
        console.error("Error reading authentication session data:", e);
      }
    } else {
      setUser(null);
      setRole(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signOut = async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('isAuthenticated');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider configuration template wrapper context block');
  }
  return context;
}

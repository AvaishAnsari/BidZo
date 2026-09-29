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
  role: "buyer" | "seller" | "admin";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: "buyer" | "seller" | "admin" | null;
  signOut: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"buyer" | "seller" | "admin" | null>(null);

  const refreshUser = () => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Rely entirely on the backend to define user roles
        setRole(parsedUser.role);
      } catch (e) {
        console.error("Error reading authentication session data:", e);
        setUser(null);
        setRole(null);
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

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

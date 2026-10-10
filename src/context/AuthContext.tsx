import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../types';

export interface User {
  id: number;
  username: string;
  email: string;
  role: "buyer" | "seller" | "admin";
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loading: boolean;
  role: "buyer" | "seller" | "admin" | null;
  userRole: UserRole | null;
  userName: string | null;
  session: any | null; // Placeholder for legacy compatibility
  signIn: (email: string, password: string, recaptchaToken?: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;

  signInWithOtp: (identifier: string, channel: 'email' | 'sms', recaptchaToken?: string) => Promise<{ error: string | null }>;
  verifyOtp: (identifier: string, token: string, channel: 'email' | 'sms', recaptchaToken?: string) => Promise<{ error: string | null }>;
  signUpOtp: (email: string, name: string, role: UserRole) => Promise<{ error: string | null }>;
  signInWithGoogle: (token: string) => Promise<{ error: string | null; isNewUser?: boolean }>;

  updateRole: (role: UserRole) => Promise<{ error: string | null }>;
  isConfigured: boolean;
  refreshUser: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  const refreshUser = useCallback(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setRole(parsedUser.role as UserRole);
      } catch (e) {
        console.error("Error reading authentication session data:", e);
        setUser(null);
        setRole(null);
      }
    } else {
      setUser(null);
      setRole(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const expireSession = () => {
      setUser(null);
      setRole(null);
      setIsLoading(false);
    };
    window.addEventListener('bidzo:auth-expired', expireSession);
    return () => window.removeEventListener('bidzo:auth-expired', expireSession);
  }, []);

  const updateRole = useCallback(
    async (newRole: UserRole): Promise<{ error: string | null }> => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return { error: 'Not authenticated' };

        const response = await fetch(`${API_BASE_URL}/users/role/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: newRole }),
        });

        const result = await response.json();
        if (response.ok && result.success) {
          setRole(newRole);
          if (user) {
            const updatedUser = { ...user, role: newRole };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          return { error: null };
        } else {
          return { error: result.error || 'Failed to update role' };
        }
      } catch (err) {
        return { error: 'Failed to connect to server' };
      }
    },
    [user],
  );

  const signIn = useCallback(
    async (email: string, password: string, recaptchaToken = ''): Promise<{ error: string | null }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password, recaptcha_token: recaptchaToken }),
        });
        const result = await response.json();
        if (response.ok && result.success) {
          localStorage.setItem('user', JSON.stringify(result.user));
          localStorage.setItem('access_token', result.access);
          if (result.refresh) {
            localStorage.setItem('refresh_token', result.refresh);
          }
          refreshUser();
          return { error: null };
        } else {
          return { error: result.error || 'Invalid username or password.' };
        }
      } catch (err: any) {
        return { error: 'Could not connect to the backend server.' };
      }
    },
    [refreshUser],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string, userRole: UserRole): Promise<{ error: string | null }> => {
      try {
        const response = await fetch(`${API_BASE_URL}/register/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, username: name, role: userRole }),
        });
        const result = await response.json();
        if (response.ok) {
          return await signIn(email, password);
        } else {
          return { error: result.error || 'Registration failed.' };
        }
      } catch (err: any) {
        return { error: 'Could not connect to the backend server.' };
      }
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('isAuthenticated');
    setUser(null);
    setRole(null);
  }, []);

  const signInWithOtp = useCallback(async (identifier: string, channel: 'email' | 'sms', recaptchaToken = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, channel, recaptcha_token: recaptchaToken }),
      });
      const result = await response.json();
      return response.ok ? { error: null } : { error: result.error || 'Could not send a sign-in code.' };
    } catch {
      return { error: 'Could not connect to the backend server.' };
    }
  }, []);

  const verifyOtp = useCallback(async (identifier: string, code: string, channel: 'email' | 'sms', recaptchaToken = '') => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/otp/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code, channel, recaptcha_token: recaptchaToken }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        return { error: result.error || 'The sign-in code is invalid or expired.' };
      }
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('access_token', result.access);
      if (result.refresh) localStorage.setItem('refresh_token', result.refresh);
      refreshUser();
      return { error: null };
    } catch {
      return { error: 'Could not connect to the backend server.' };
    }
  }, [refreshUser]);
  const signUpOtp = useCallback(async () => ({ error: 'OTP registration is not supported yet.' }), []);
  
  const signInWithGoogle = useCallback(async (token: string): Promise<{ error: string | null; isNewUser?: boolean }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('access_token', result.access);
        if (result.refresh) {
          localStorage.setItem('refresh_token', result.refresh);
        }
        refreshUser();
        return { error: null, isNewUser: result.is_new_user };
      } else {
        return { error: result.error || 'Google authentication failed.' };
      }
    } catch (err: any) {
      return { error: 'Could not connect to the backend server.' };
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loading: isLoading,
        role,
        userRole: role,
        userName: user?.username || user?.email?.split('@')[0] || null,
        session: null,
        signIn,
        signUp,
        signUpOtp,
        signInWithOtp,
        verifyOtp,
        signInWithGoogle,
        signOut,
        updateRole,
        isConfigured: Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

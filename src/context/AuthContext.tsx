/**
 * AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for authentication in BidZo.
 *
 * Works in TWO modes:
 *   • Supabase mode  — when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
 *   • Offline mode   — falls back to localStorage-backed mock auth so the UI
 *                      works fully without a database connection.
 *
 * Exposes: user, session, isLoading, userRole, signIn, signUp, signOut
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'buyer' | 'seller';

export interface AuthContextType {
  /** Supabase User object (or mock equivalent in offline mode) */
  user: User | null;
  /** Supabase Session (null in offline mode) */
  session: Session | null;
  /** True while the initial session is being loaded */
  isLoading: boolean;
  /** Role fetched from the `users` table (or stored in mock) */
  userRole: UserRole | null;
  /** Display name — from user_metadata or mock account */
  userName: string | null;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Register a new account */
  signUp: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => Promise<{ error: string | null }>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Whether Supabase credentials are configured */
  isConfigured: boolean;
}

// ── Mock storage keys ─────────────────────────────────────────────────────────

const MOCK_USER_KEY      = 'bidzo_mock_user';
const MOCK_ACCOUNTS_KEY  = 'bidzo_mock_accounts'; // { [email]: { password, name, role } }

interface MockAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

function getMockAccounts(): Record<string, MockAccount> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_ACCOUNTS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveMockAccount(account: MockAccount) {
  const accounts = getMockAccounts();
  accounts[account.email] = account;
  localStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(accounts));
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,      setUser]      = useState<User | null>(null);
  const [session,   setSession]   = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole,  setUserRole]  = useState<UserRole | null>(null);
  const [userName,  setUserName]  = useState<string | null>(null);

  // ── Helper: fetch role from Supabase users table ────────────────────────────
  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data?.role) {
        setUserRole(data.role as UserRole);
      } else {
        // Role row missing — default to buyer
        setUserRole('buyer');
      }
    } catch {
      setUserRole('buyer');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Bootstrap: load existing session on mount ───────────────────────────────
  useEffect(() => {
    // ── OFFLINE mode ──────────────────────────────────────────────────────────
    if (!isSupabaseConfigured()) {
      const raw = localStorage.getItem(MOCK_USER_KEY);
      if (raw) {
        try {
          const mockUser = JSON.parse(raw) as MockAccount;
          setUser({ id: mockUser.id, email: mockUser.email } as User);
          setUserRole(mockUser.role);
          setUserName(mockUser.name);
        } catch {
          localStorage.removeItem(MOCK_USER_KEY);
        }
      }
      setIsLoading(false);
      return;
    }

    // ── SUPABASE mode ─────────────────────────────────────────────────────────
    const bootstrap = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setUserName(session.user.user_metadata?.name ?? null);
          await fetchUserRole(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };

    bootstrap();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setUserName(session.user.user_metadata?.name ?? null);
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
          setUserName(null);
          setIsLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  // ── signIn ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      // Offline mock
      if (!isSupabaseConfigured()) {
        const accounts = getMockAccounts();
        const account  = accounts[email.toLowerCase()];

        if (!account) {
          return { error: 'No account found with this email. Please register first.' };
        }
        if (account.password !== password) {
          return { error: 'Incorrect password. Please try again.' };
        }

        setUser({ id: account.id, email: account.email } as User);
        setUserRole(account.role);
        setUserName(account.name);
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(account));
        return { error: null };
      }

      // Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      setUser(data.user);
      setSession(data.session);
      if (data.user) {
        setUserName(data.user.user_metadata?.name ?? null);
        await fetchUserRole(data.user.id);
      }
      return { error: null };
    },
    [fetchUserRole],
  );

  // ── signUp ────────────────────────────────────────────────────────────────
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role: UserRole,
    ): Promise<{ error: string | null }> => {
      // Offline mock
      if (!isSupabaseConfigured()) {
        const accounts = getMockAccounts();

        if (accounts[email.toLowerCase()]) {
          return { error: 'An account with this email already exists.' };
        }
        if (password.length < 6) {
          return { error: 'Password must be at least 6 characters.' };
        }

        const newAccount: MockAccount = {
          id:       `mock-${Date.now()}`,
          email:    email.toLowerCase(),
          password,
          name,
          role,
        };

        saveMockAccount(newAccount);
        // Auto-login after registration
        setUser({ id: newAccount.id, email: newAccount.email } as User);
        setUserRole(role);
        setUserName(name);
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(newAccount));
        return { error: null };
      }

      // Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });

      if (authError) return { error: authError.message };

      // Insert into public users table
      if (authData.user) {
        const { error: dbError } = await supabase.from('users').insert({
          id:    authData.user.id,
          email: email.toLowerCase(),
          name,
          role,
        });

        if (dbError && !dbError.message.includes('duplicate')) {
          // Non-fatal — user was created in Auth but profile insert failed
          console.warn('[AuthContext] users table insert failed:', dbError.message);
        }

        setUser(authData.user);
        setSession(authData.session);
        setUserRole(role);
        setUserName(name);
      }

      return { error: null };
    },
    [],
  );

  // ── signOut ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      localStorage.removeItem(MOCK_USER_KEY);
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserName(null);
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        userRole,
        userName,
        signIn,
        signUp,
        signOut,
        isConfigured: isSupabaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

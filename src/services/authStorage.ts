const AUTH_KEYS = ['user', 'access_token', 'refresh_token', 'isAuthenticated'] as const;

/**
 * Keep authentication scoped to the current tab so two accounts can be used
 * side by side on the same origin (for example, seller and bidder testing).
 */
export function migrateLegacyAuthToTab() {
  if (typeof window === 'undefined' || sessionStorage.getItem('access_token')) return;

  // Preserve the existing signed-in session once when upgrading from the
  // previous shared localStorage implementation. New sessions are tab-scoped.
  const legacyToken = localStorage.getItem('access_token');
  if (!legacyToken) return;
  for (const key of AUTH_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) sessionStorage.setItem(key, value);
  }
}

export function saveTabAuth(user: unknown, access: string, refresh?: string | null) {
  sessionStorage.setItem('user', JSON.stringify(user));
  sessionStorage.setItem('access_token', access);
  if (refresh) sessionStorage.setItem('refresh_token', refresh);
  else sessionStorage.removeItem('refresh_token');
  sessionStorage.setItem('isAuthenticated', 'true');

  // Remove the old shared session after a new tab-local session is established.
  clearLegacyAuth();
}

export function clearTabAuth() {
  for (const key of AUTH_KEYS) sessionStorage.removeItem(key);
  clearLegacyAuth();
}

export function clearLegacyAuth() {
  for (const key of AUTH_KEYS) localStorage.removeItem(key);
}

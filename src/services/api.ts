const rawBase: string =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000/api';

const cleanBase = rawBase.replace(/\/+$/, '');
export const API_BASE_URL: string = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;

export const API_ROOT_URL: string =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') : 'http://localhost:8000');

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    // Buffer by 15 seconds to avoid boundary issues
    return Date.now() >= (payload.exp * 1000 - 15000);
  } catch {
    return true;
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  window.dispatchEvent(new Event('bidzo:auth:logout'));
}

let refreshPromise: Promise<string | null> | null = null;

export async function getValidAccessToken(): Promise<string | null> {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return null;

  if (!isTokenExpired(token)) {
    return token;
  }

  // Token is expired. Try refreshing using refresh_token
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken || isTokenExpired(refreshToken)) {
    clearAuthSession();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.access) {
            localStorage.setItem('access_token', data.access);
            if (data.refresh) {
              localStorage.setItem('refresh_token', data.refresh);
            }
            return data.access;
          }
        }
        clearAuthSession();
        return null;
      } catch {
        clearAuthSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Only attach valid, non-expired tokens to prevent 401s on public endpoints
  if (token && !isTokenExpired(token)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function getValidAuthHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

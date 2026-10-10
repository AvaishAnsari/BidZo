import toast from 'react-hot-toast';

let authErrorReported = false;

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/** Clear an obsolete/expired Django JWT once instead of showing a toast per card. */
export function handleAuthError(response: Response, body: any): boolean {
  const detail = String(body?.detail || body?.error || '').toLowerCase();
  const invalidToken = response.status === 401 && (
    body?.code === 'token_not_valid' || detail.includes('token not valid') || detail.includes('token is invalid') || detail.includes('token has expired')
  );
  if (!invalidToken) return false;

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  window.dispatchEvent(new Event('bidzo:auth-expired'));
  if (!authErrorReported) {
    authErrorReported = true;
    toast.error('Your saved sign-in has expired. Please sign in again.');
  }
  return true;
}

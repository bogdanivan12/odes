/**
 * Centralised auth-token helpers.
 *
 * Access token  — short-lived JWT (30 min), stored in localStorage, sent as
 *                 the Authorization header on every API call.
 * Refresh token — long-lived JWT (7 days), stored in an HttpOnly cookie set
 *                 by the server.  JavaScript cannot read or steal it.
 *
 * When the access token expires the API returns 401.  apiClient.ts intercepts
 * this, POSTs to /auth/refresh (the browser attaches the cookie automatically
 * via credentials:'include'), receives a new access token, stores it, and
 * replays the original request — all transparently.
 *
 * isAuthenticated() is a UI gate only (not a security check).  It returns true
 * as long as an access token sits in localStorage.  If the refresh cookie has
 * also expired, the next API call will fail the silent refresh and redirect the
 * user to /login.
 */

const ACCESS_KEY = 'accessToken';

export function getAccessToken(): string | null {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
}

export function setAccessToken(accessToken: string): void {
  try { localStorage.setItem(ACCESS_KEY, accessToken); } catch { /* ignore */ }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY);
    // Remove legacy keys from earlier versions so stale sessions are cleared.
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authToken');
  } catch { /* ignore */ }
}

/**
 * Returns true when an access token is present in localStorage.
 *
 * This is a UI gate, not a cryptographic check.  The actual validity of the
 * session is determined by the server on the next API call (which will trigger
 * a silent refresh via the HttpOnly cookie if the access token is expired).
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const t = getAccessToken();
  return !!t && t.trim().length > 0;
}

/** Returns the Authorization header value, or empty string if not logged in. */
export function getAuthorizationHeader(): string {
  const token = getAccessToken();
  if (!token) return '';
  // Stored tokens are raw JWTs (no "Bearer " prefix).
  return `Bearer ${token}`;
}

/**
 * Centralised auth-token helpers.
 *
 * Access token  — short-lived JWT (30 min), used as the Authorization header.
 * Refresh token — long-lived JWT (7 days), used to silently obtain new access tokens.
 *
 * The session is considered alive as long as a refresh token is present.
 * An expired (or missing) access token is transparently renewed by apiClient.ts
 * on the next API call without any user interaction.
 */

const ACCESS_KEY  = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function getAccessToken(): string | null {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
}

export function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  } catch { /* ignore */ }
}

export function setAccessToken(accessToken: string): void {
  try { localStorage.setItem(ACCESS_KEY, accessToken); } catch { /* ignore */ }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    // Remove the old key used before this refactor so stale sessions are cleared.
    localStorage.removeItem('authToken');
  } catch { /* ignore */ }
}

/** Decode a JWT payload without verifying the signature (UI-only, not security-critical). */
function jwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * The session is valid as long as a non-expired refresh token exists.
 * Expiry is checked client-side by decoding the JWT payload (no signature
 * verification — this is only used to gate the UI, not for security).
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const t = getRefreshToken();
  if (!t || !t.trim()) return false;
  const exp = jwtExpiry(t);
  if (exp === null) return true; // can't read expiry — assume valid
  return Date.now() / 1000 < exp;
}

/** Returns the Authorization header value, or empty string if not logged in. */
export function getAuthorizationHeader(): string {
  const token = getAccessToken();
  if (!token) return '';
  // Stored tokens are raw JWTs (no "Bearer " prefix).
  return `Bearer ${token}`;
}

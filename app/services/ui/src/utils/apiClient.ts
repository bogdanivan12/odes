import { API_URL } from '../config/constants';
import {
  setAccessToken,
  clearTokens,
  getAuthorizationHeader,
} from './auth';

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: ApiMethod;
  url: string;
  body?: any;
  headers?: Record<string, string>;
  raw?: boolean; // If true, return raw text even if JSON parse succeeds
  _retried?: boolean; // Internal flag — prevents infinite refresh loops
}

export interface ApiError extends Error {
  status?: number;
  body?: any;
}

export async function apiRequest<T = any>(opts: ApiRequestOptions): Promise<T> {
  const { method = "GET", url, body, headers = {}, raw = false, _retried = false } = opts;

  // Detect if caller already provided a Content-Type (case-insensitive).
  // If so, do not add/overwrite it. This prevents accidental overwrites
  // and respects user-specified header casing/values.
  const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === "content-type");

  // Auto-inject Authorization header when the caller hasn't provided one and a
  // token is available. Skip for auth endpoints (login / refresh) to avoid
  // sending a stale token where it's irrelevant.
  const hasAuth = Object.keys(headers).some(k => k.toLowerCase() === "authorization");
  const isAuthEndpoint = url.includes('/auth/');
  const authHeader: Record<string, string> = {};
  if (!hasAuth && !isAuthEndpoint) {
    const authValue = getAuthorizationHeader();
    if (authValue) authHeader['Authorization'] = authValue;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...(body && !hasContentType ? { "Content-Type": "application/json" } : {}),
      ...authHeader,
      ...headers,
    },
  };

  if (body !== undefined) {
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);

  // read the body once
  const text = await res.text();

  // try parse JSON when sensible
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = text;
    }
  }

  // ── Silent token refresh on 401 ────────────────────────────────────────────
  // When the access token has expired the API returns 401. We try to exchange
  // the refresh token for a new access token and replay the original request
  // exactly once. If the refresh itself fails the user is logged out.
  if (res.status === 401 && !_retried && !isAuthEndpoint) {
    try {
      // The refresh token is an HttpOnly cookie — the browser attaches it
      // automatically via credentials:'include'.  No body needed.
      const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.access_token;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          // Replay the original request with the fresh token.
          return apiRequest<T>({ ...opts, _retried: true });
        }
      }
    } catch { /* fall through to logout */ }
    // Refresh failed — end the session.
    clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  if (!res.ok) {
    // Build a verbose, developer-friendly message from common API shapes
    let message: string = res.statusText || "API request failed";

    if (parsed) {
      if (typeof parsed === "string") {
        message = parsed;
      } else if (parsed?.message) {
        message = parsed.message;
      } else if (parsed?.error) {
        message = parsed.error;
      } else if (parsed?.errors) {
        if (Array.isArray(parsed.errors)) message = parsed.errors.join(", ");
        else if (typeof parsed.errors === "object") message = JSON.stringify(parsed.errors);
        else message = String(parsed.errors);
      } else if (parsed?.detail) {
        // some APIs use `detail` for human-readable messages (e.g. FastAPI)
        message = parsed.detail;
      } else if (parsed?.description) {
        message = parsed.description;
      } else if (typeof parsed === 'object') {
        // If it's an object with one or more string values, try to present them nicely
        try {
          const stringValues = Object.values(parsed).filter(v => typeof v === 'string');
          if (stringValues.length === 1) message = stringValues[0];
          else if (stringValues.length > 1) message = stringValues.join(', ');
          else message = JSON.stringify(parsed);
        } catch (e) {
          message = JSON.stringify(parsed);
        }
      } else {
        // fallback: stringify whatever the body is
        try {
          message = JSON.stringify(parsed);
        } catch (e) {
          message = String(parsed);
        }
      }
    }

    message = String(message).trim();

    const err: ApiError = new Error(message);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }

  return raw ? (text as unknown as T) : (parsed as T);
}

export const apiGet = <T = any>(url: string, headers?: Record<string, string>) =>
  apiRequest<T>({ method: "GET", url, headers });
export const apiPost = <T = any>(url: string, body?: any, headers?: Record<string, string>) =>
  apiRequest<T>({ method: "POST", url, body, headers });
export const apiPut = <T = any>(url: string, body?: any, headers?: Record<string, string>) =>
  apiRequest<T>({ method: "PUT", url, body, headers });
export const apiDelete = <T = any>(url: string, headers?: Record<string, string>) =>
  apiRequest<T>({ method: "DELETE", url, headers });
export const apiPatch = <T = any>(url: string, body?: any, headers?: Record<string, string>) =>
  apiRequest<T>({ method: "PATCH", url, body, headers });

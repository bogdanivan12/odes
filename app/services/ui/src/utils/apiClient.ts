export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions {
  method?: ApiMethod;
  url: string;
  body?: any;
  headers?: Record<string, string>;
  raw?: boolean; // If true, return raw text even if JSON parse succeeds
}

export interface ApiError extends Error {
  status?: number;
  body?: any;
}

export async function apiRequest<T = any>(opts: ApiRequestOptions): Promise<T> {
  const { method = "GET", url, body, headers = {}, raw = false } = opts;

  // Detect if caller already provided a Content-Type (case-insensitive).
  // If so, do not add/overwrite it. This prevents accidental overwrites
  // and respects user-specified header casing/values.
  const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === "content-type");

  const fetchOptions: RequestInit = {
    method,
    headers: { ...(body && !hasContentType ? { "Content-Type": "application/json" } : {}), ...headers },
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

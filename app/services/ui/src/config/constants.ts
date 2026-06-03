// Empty string = relative URLs, so nginx can proxy /api to the backend.
// For local Vite dev server, set VITE_API_URL=http://localhost:8080 in a .env.local file.
export const API_URL = import.meta.env.VITE_API_URL ?? "";

// API route paths
export const API_INSTITUTIONS_PATH = "/api/v1/institutions";
export const SIGNUP_URL = `${API_URL}/api/v1/users`;
export const SIGNIN_URL = `${API_URL}/api/v1/auth/token`;
export const GOOGLE_SIGNIN_URL = `${API_URL}/api/v1/auth/google`;

// Google OAuth Web client ID (public — also embedded in the backend as the
// expected token audience). Override at build time with VITE_GOOGLE_CLIENT_ID.
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  "941006428883-ig2s9kbmkgjdg8ahtciagrdbu2h55agi.apps.googleusercontent.com";

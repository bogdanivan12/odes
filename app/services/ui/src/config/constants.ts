// Empty string = relative URLs, so nginx can proxy /api to the backend.
// For local Vite dev server, set VITE_API_URL=http://localhost:8080 in a .env.local file.
export const API_URL = import.meta.env.VITE_API_URL ?? "";

// API route paths
export const API_INSTITUTIONS_PATH = "/api/v1/institutions";
export const SIGNUP_URL = `${API_URL}/api/v1/users`;
export const SIGNIN_URL = `${API_URL}/api/v1/auth/token`;

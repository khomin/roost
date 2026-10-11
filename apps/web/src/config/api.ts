// ─── API Config ───────────────────────────────────────────────────────────────
// Single source of truth for the backend API base URL.

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (window.location.origin.includes("localhost")) {
    return 'http://localhost:8080';
  }
  return `${window.location.origin}/api/`;
};

export const API_CONFIG = {
  /** Backend API base URL (no trailing slash) */
  baseUrl: getApiBaseUrl(),
} as const;
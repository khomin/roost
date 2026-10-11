// ─── API Config ───────────────────────────────────────────────────────────────
// Single source of truth for the backend API base URL.

export const API_CONFIG = {
  /** Backend API base URL (no trailing slash) */
  baseUrl: 'http://localhost:8080',
} as const;
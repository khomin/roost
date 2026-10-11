// ─── Keycloak / OIDC Config ───────────────────────────────────────────────────
// Single source of truth – update here if your realm/client ever changes.

const getBaseUrl = () => {
  // Option A: If using Vite env variables (recommended)
  if (import.meta.env.VITE_KEYCLOAK_URL) {
    return import.meta.env.VITE_KEYCLOAK_URL;
  }

  // Option B: If Nginx handles Keycloak under /auth on the same domain
  if (window.location.origin.includes("localhost")) {
    return 'http://localhost:8081';
  }
  return window.location.origin;
};

function getRedirectUrl(): string {
  return window.location.origin;
}

export const KEYCLOAK_CONFIG = {
  /** The Keycloak server base URL (no trailing slash) */
  baseUrl: getBaseUrl(),

  /** Realm name */
  realm: 'roost',

  /** Public client id registered in Keycloak */
  clientId: 'roost-app',
} as const;

// Derived OIDC endpoint URLs (OpenID Connect standard paths)
const base = `${KEYCLOAK_CONFIG.baseUrl}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect`;

export const OIDC_ENDPOINTS = {
  authorization: `${base}/auth`,
  token: `${base}/token`,
  logout: `${base}/logout`,
  userinfo: `${base}/userinfo`,
} as const;

// The URL Keycloak will redirect back to after login
export const REDIRECT_URI = `${getRedirectUrl()}/callback`;

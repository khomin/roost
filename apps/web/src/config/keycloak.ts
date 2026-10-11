// ─── Keycloak / OIDC Config ───────────────────────────────────────────────────
// Single source of truth – update here if your realm/client ever changes.

export const KEYCLOAK_CONFIG = {
  /** The Keycloak server base URL (no trailing slash) */
  baseUrl: 'http://localhost:9090',

  /** Realm name */
  realm: 'whale-tracker',

  /** Public client id registered in Keycloak */
  clientId: 'whale-tracker-app',
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
export const REDIRECT_URI = `${window.location.origin}/callback`;

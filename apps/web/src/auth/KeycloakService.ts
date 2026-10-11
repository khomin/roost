// ─── Keycloak PKCE Auth Service ───────────────────────────────────────────────
// Framework-agnostic: plain TypeScript class that manages the PKCE OAuth2 flow.
// The React layer (AuthContext) is the only consumer.

import { KEYCLOAK_CONFIG, OIDC_ENDPOINTS, REDIRECT_URI } from '../config/keycloak';
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';

// ── Storage keys (sessionStorage – cleared when tab closes) ──────────────────
const STORAGE_KEYS = {
  accessToken: 'kc_access_token',
  idToken: 'kc_id_token',
  refreshToken: 'kc_refresh_token',
  expiresAt: 'kc_expires_at',    // Unix timestamp (ms)
  codeVerifier: 'kc_code_verifier', // Temporary – only needed during the callback
  oauthState: 'kc_oauth_state',   // Temporary – CSRF guard
} as const;

// ── Token payload shape (what we care about) ─────────────────────────────────
export interface UserInfo {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

// ── Token response from Keycloak /token endpoint ─────────────────────────────
interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;   // seconds
  token_type: string;
}

// ─────────────────────────────────────────────────────────────────────────────

class KeycloakService {
  // ── Step 1: Redirect the browser to Keycloak's login page ─────────────────
  async login(): Promise<void> {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();

    // Persist verifier + state so we can use them in the callback
    sessionStorage.setItem(STORAGE_KEYS.codeVerifier, verifier);
    sessionStorage.setItem(STORAGE_KEYS.oauthState, state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: KEYCLOAK_CONFIG.clientId,
      redirect_uri: REDIRECT_URI,
      scope: 'openid profile email',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    // http://localhost:9090/realms/whale-tracker/protocol/openid-connect/auth
    window.location.href = `${OIDC_ENDPOINTS.authorization}?${params}`;
  }

  // ── Step 2: Exchange the authorization code for tokens ────────────────────
  async handleCallback(code: string, returnedState: string): Promise<void> {
    const storedState = sessionStorage.getItem(STORAGE_KEYS.oauthState);
    const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);

    // CSRF guard
    if (returnedState !== storedState) {
      throw new Error('OAuth state mismatch – possible CSRF attack.');
    }
    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier – cannot complete login.');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEYCLOAK_CONFIG.clientId,
      redirect_uri: REDIRECT_URI,
      code: code,
      code_verifier: codeVerifier,
      scope: "openid profile email",
    });
    try {
      console.log(`code: ${code}`)
      console.log(`code_verifier: ${codeVerifier}`)
      const response = await fetch(OIDC_ENDPOINTS.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Token exchange failed: ${err}`);
      }

      const tokens: TokenResponse = await response.json();
      this._storeTokens(tokens);

      // Clean up temporary PKCE values
      sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
      sessionStorage.removeItem(STORAGE_KEYS.oauthState);

    } catch (error) {
      console.error(error);
    }
  }

  // ── Refresh the access token using the refresh token ─────────────────────
  async refreshToken(): Promise<boolean> {
    const refresh = sessionStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!refresh) return false;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CONFIG.clientId,
      refresh_token: refresh,
    });

    try {
      const response = await fetch(OIDC_ENDPOINTS.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const tokens: TokenResponse = await response.json();
      this._storeTokens(tokens);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // ── Logout: clear local state + redirect to Keycloak logout ──────────────
  logout(): void {
    const idToken = sessionStorage.getItem(STORAGE_KEYS.idToken);
    const params = new URLSearchParams({
      client_id: KEYCLOAK_CONFIG.clientId,
      post_logout_redirect_uri: window.location.origin,
    });
    if (idToken) {
      params.append('id_token_hint', idToken);
    }
    this.clearTokens();
    window.location.href = `${OIDC_ENDPOINTS.logout}?${params}`;
  }

  // ── Check if the user is currently authenticated (token present + not expired) ─
  isAuthenticated(): boolean {
    const token = sessionStorage.getItem(STORAGE_KEYS.accessToken);
    const expiresAt = sessionStorage.getItem(STORAGE_KEYS.expiresAt);
    if (!token || !expiresAt) return false;
    // Give a 30-second buffer before the real expiry
    return Date.now() < Number(expiresAt) - 30_000;
  }

  // ── Get the raw access token (to attach as Bearer header) ─────────────────
  getAccessToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.accessToken);
  }

  // ── Decode the JWT payload and return user info ───────────────────────────
  getUserInfo(): UserInfo | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded as UserInfo;
    } catch {
      return null;
    }
  }

  // ── Clear all stored tokens ───────────────────────────────────────────────
  clearTokens(): void {
    Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
  }

  // ─── Private ──────────────────────────────────────────────────────────────
  private _storeTokens(tokens: TokenResponse): void {
    sessionStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
    if (tokens.id_token) {
      sessionStorage.setItem(STORAGE_KEYS.idToken, tokens.id_token); // <-- ADD THIS
    }
    if (tokens.refresh_token) {
      sessionStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
    }
    // Convert expires_in (seconds) to an absolute timestamp
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    sessionStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
  }
}

// Export a singleton – one instance shared across the whole app
export const keycloakService = new KeycloakService();

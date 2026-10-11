// ─── Auth Context ─────────────────────────────────────────────────────────────
// Provides authentication state and actions to the entire React tree.
// Wrap your app with <AuthProvider> once in main.tsx.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { keycloakService, type UserInfo } from './KeycloakService';

// ─── Shape of the context value ──────────────────────────────────────────────

interface AuthContextValue {
  /** True once the initial auth-check is done (prevents flash of wrong page) */
  isInitialized: boolean;
  /** Whether the user has a valid, non-expired access token */
  isAuthenticated: boolean;
  /** True when using demo mode (demo_token) */
  isDemo: boolean;
  /** Decoded JWT payload – null when logged out */
  user: UserInfo | null;
  /** Raw Bearer token – use this when calling your Go backend */
  accessToken: string | null;
  /** Redirect to Keycloak login page (PKCE flow) */
  login: () => Promise<void>;
  /** Clear tokens + redirect to Keycloak logout */
  logout: () => void;
  /** Enter demo mode */
  startDemo: () => void;
}

// ─── Context + hook ───────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // ── Bootstrap: check existing token on first render ───────────────────────
  useEffect(() => {
    const init = async () => {
      // Check for demo mode first
      const token = sessionStorage.getItem('kc_access_token');
      if (token === 'demo_token') {
        const expiresAt = sessionStorage.getItem('kc_expires_at');
        if (expiresAt && Date.now() < Number(expiresAt)) {
          // Demo token is valid - use getUserInfo which reads cached user info
          const userInfo = keycloakService.getUserInfo();
          if (userInfo) {
            setUser(userInfo);
          }
          setAccessToken('demo_token');
          setIsAuthenticated(true);
          setIsDemo(true);
          setIsInitialized(true);
          return;
        }
      }

      if (keycloakService.isAuthenticated()) {
        // Token is still valid – hydrate state
        _syncState();
      } else {
        // Try to silently refresh before giving up
        const refreshed = await keycloakService.refreshToken();
        if (refreshed) _syncState();
      }
      setIsInitialized(true);
    };

    init();
  }, []);

  // ── Token-refresh timer: refresh 60s before expiry ────────────────────────
  useEffect(() => {
    // Skip refresh timer for demo mode
    if (!isAuthenticated || isDemo) return;

    const expiresAtStr = sessionStorage.getItem('kc_expires_at');
    if (!expiresAtStr) return;

    const msUntilRefresh = Number(expiresAtStr) - Date.now() - 60_000;
    if (msUntilRefresh <= 0) return;

    const timer = setTimeout(async () => {
      const ok = await keycloakService.refreshToken();
      if (ok) {
        _syncState();
      } else {
        _clearState();
      }
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [isAuthenticated, accessToken, isDemo]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const login = useCallback(async () => {
    await keycloakService.login();
  }, []);

  const logout = useCallback(() => {
    keycloakService.logout(); // also redirects away
    _clearState();
  }, []);

  const startDemo = useCallback(() => {
    const now = Date.now();
    const demoUser: UserInfo = {
      sub: 'demo-user',
      preferred_username: 'demo_whale',
      name: 'Demo Whale',
      email: 'demo@whaletracker.app',
    };
    sessionStorage.setItem('kc_access_token', 'demo_token');
    sessionStorage.setItem('kc_id_token', 'demo_id_token');
    sessionStorage.setItem('kc_expires_at', String(now + 24 * 60 * 60 * 1000)); // 24h
    sessionStorage.setItem('kc_refresh_token', 'demo_refresh_token');
    sessionStorage.setItem('kc_user_info', JSON.stringify(demoUser));
    setAccessToken('demo_token');
    setUser(demoUser);
    setIsAuthenticated(true);
    setIsDemo(true);
  }, []);

  // Called after a successful token exchange (from CallbackPage)
  // Exported so CallbackPage can trigger a state sync after handleCallback()
  const syncAfterCallback = useCallback(() => {
    _syncState();
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function _syncState() {
    setIsAuthenticated(true);
    setUser(keycloakService.getUserInfo());
    setAccessToken(keycloakService.getAccessToken());
    setIsDemo(false);
  }

  function _clearState() {
    setIsAuthenticated(false);
    setIsDemo(false);
    setUser(null);
    setAccessToken(null);
  }

  // ─── Context value (memoized to avoid unnecessary re-renders) ─────────────
  const value = useMemo<AuthContextValue>(
    () => ({ isInitialized, isAuthenticated, isDemo, user, accessToken, login, logout, startDemo }),
    [isInitialized, isAuthenticated, isDemo, user, accessToken, login, logout, startDemo],
  );

  // Expose syncAfterCallback on the service so CallbackPage can reach it
  // without needing a second context hook.
  (keycloakService as any).__syncAfterCallback = syncAfterCallback;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

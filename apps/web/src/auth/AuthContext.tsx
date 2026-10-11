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
  /** Decoded JWT payload – null when logged out */
  user: UserInfo | null;
  /** Raw Bearer token – use this when calling your Go backend */
  accessToken: string | null;
  /** Redirect to Keycloak login page (PKCE flow) */
  login: () => Promise<void>;
  /** Clear tokens + redirect to Keycloak logout */
  logout: () => void;
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
  const [isInitialized,   setIsInitialized]   = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user,            setUser]            = useState<UserInfo | null>(null);
  const [accessToken,     setAccessToken]     = useState<string | null>(null);

  // ── Bootstrap: check existing token on first render ───────────────────────
  useEffect(() => {
    const init = async () => {
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
    if (!isAuthenticated) return;

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
  }, [isAuthenticated, accessToken]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const login = useCallback(async () => {
    await keycloakService.login();
  }, []);

  const logout = useCallback(() => {
    keycloakService.logout(); // also redirects away
    _clearState();
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
  }

  function _clearState() {
    setIsAuthenticated(false);
    setUser(null);
    setAccessToken(null);
  }

  // ─── Context value (memoized to avoid unnecessary re-renders) ─────────────
  const value = useMemo<AuthContextValue>(
    () => ({ isInitialized, isAuthenticated, user, accessToken, login, logout }),
    [isInitialized, isAuthenticated, user, accessToken, login, logout],
  );

  // Expose syncAfterCallback on the service so CallbackPage can reach it
  // without needing a second context hook.
  (keycloakService as any).__syncAfterCallback = syncAfterCallback;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

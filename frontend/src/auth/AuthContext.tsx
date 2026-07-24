import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User, AuthTokens } from '../types';
import { getCurrentUser, getAuthMethod, loginWithPassword } from '../api/auth';
import { configureApiClient } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  authMethod: 'google' | 'userpass' | null;
  login: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
  setTokens: (tokens: AuthTokens) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// In-memory token storage + sessionStorage fallback for page reloads.
// sessionStorage is per-tab and cleared when the tab closes — safer than
// localStorage for persisting across page reloads without surviving sessions.
// It also allows E2E tests to survive page.goto() full-page reloads.
let accessToken: string | null = sessionStorage.getItem('accessToken') || null;
let refreshTokenValue: string | null = sessionStorage.getItem('refreshToken') || null;

function persistTokens(access: string | null, refresh: string | null) {
  if (access) {
    sessionStorage.setItem('accessToken', access);
  } else {
    sessionStorage.removeItem('accessToken');
  }
  if (refresh) {
    sessionStorage.setItem('refreshToken', refresh);
  } else {
    sessionStorage.removeItem('refreshToken');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMethod, setAuthMethod] = useState<'google' | 'userpass' | null>(null);

  const getToken = useCallback(() => accessToken, []);
  const getRefreshToken = useCallback(() => refreshTokenValue, []);

  /**
   * Stores tokens only. Must stay synchronous — the refresh interceptor in
   * api/client.ts calls this on every successful /auth/refresh; if it were
   * async with side effects it would recurse via /auth/me → 401 → refresh.
   *
   * Callers that need to update `user` post-token-change should explicitly
   * invoke `refreshUser()` (which is what AuthCallbackPage does on the
   * OAuth round-trip).
   */
  const setTokens = useCallback((tokens: AuthTokens) => {
    accessToken = tokens.accessToken;
    refreshTokenValue = tokens.refreshToken;
    persistTokens(tokens.accessToken, tokens.refreshToken);
  }, []);

  /**
   * Fetches the current user. Used by OAuth callback after setTokens, and
   * exposed for any caller that needs to manually re-sync user state.
   * Failures are intentionally swallowed: a transient /auth/me failure
   * should not log the user out.
   */
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      /* transient failure — leave user state alone */
    }
  }, []);

  const login = useCallback(() => {
    if (authMethod === 'userpass') {
      // Handled by the Header component showing the LoginModal
      return;
    }
    window.location.href = '/api/auth/google';
  }, [authMethod]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const tokens = await loginWithPassword(email, password);
    accessToken = tokens.accessToken;
    refreshTokenValue = tokens.refreshToken;
    persistTokens(tokens.accessToken, tokens.refreshToken);
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    accessToken = null;
    refreshTokenValue = null;
    persistTokens(null, null);
    setUser(null);
    window.location.href = '/';
  }, []);

  // Wire API client, fetch auth method, and restore session
  useEffect(() => {
    configureApiClient(getToken, getRefreshToken, setTokens, logout);

    // Fetch auth method from backend
    getAuthMethod()
      .then((res) => setAuthMethod(res.method))
      .catch(() => setAuthMethod('google')); // Default to google if endpoint unavailable

    if (getRefreshToken()) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [getToken, getRefreshToken, setTokens, refreshUser, logout]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, authMethod, login, loginWithEmail, logout, getToken, setTokens, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

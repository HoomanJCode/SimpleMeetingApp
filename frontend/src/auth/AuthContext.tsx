import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User, AuthTokens } from '../types';
import { getCurrentUser } from '../api/auth';
import { configureApiClient } from '../api/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  getToken: () => string | null;
  setTokens: (tokens: AuthTokens) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// In-memory token storage (never localStorage for security)
let accessToken: string | null = null;
let refreshTokenValue: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    window.location.href = '/api/auth/google';
  }, []);

  const logout = useCallback(() => {
    accessToken = null;
    refreshTokenValue = null;
    setUser(null);
    window.location.href = '/';
  }, []);

  // Wire API client and restore session (must be a single effect to guarantee order)
  useEffect(() => {
    configureApiClient(getToken, getRefreshToken, setTokens, logout);

    if (getRefreshToken()) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [getToken, getRefreshToken, setTokens, refreshUser, logout]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, getToken, setTokens, refreshUser }}
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

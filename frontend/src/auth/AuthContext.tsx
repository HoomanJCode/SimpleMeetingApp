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

  const setTokens = useCallback((tokens: AuthTokens) => {
    accessToken = tokens.accessToken;
    refreshTokenValue = tokens.refreshToken;
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

    const restoreSession = async () => {
      try {
        const stored = getRefreshToken();
        if (stored) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch {
        // Session expired, clear tokens
        accessToken = null;
        refreshTokenValue = null;
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [getToken, getRefreshToken, setTokens, logout]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, getToken, setTokens }}>
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

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User, AuthTokens } from '../types';
import { getCurrentUser, refreshToken as apiRefreshToken } from '../api/auth';

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

  // On mount, check if we have a stored refresh token and try to restore session
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (refreshTokenValue) {
          const tokens = await apiRefreshToken(refreshTokenValue);
          setTokens(tokens);
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

    // Check URL for OAuth callback tokens
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const refreshParam = params.get('refreshToken');

    if (tokenParam && refreshParam) {
      setTokens({ accessToken: tokenParam, refreshToken: refreshParam });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Fetch user
      getCurrentUser().then(setUser).catch(() => {}).finally(() => setIsLoading(false));
    } else {
      restoreSession();
    }
  }, [setTokens]);

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

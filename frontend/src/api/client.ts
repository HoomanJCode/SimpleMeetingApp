import type { ApiError } from '../types';

const BASE_URL = '/api';

let getTokenFn: (() => string | null) | null = null;
let getRefreshTokenFn: (() => string | null) | null = null;
let setTokensFn: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function configureApiClient(
  getToken: () => string | null,
  getRefreshToken: () => string | null,
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void,
  onAuthError: () => void
) {
  getTokenFn = getToken;
  getRefreshTokenFn = getRefreshToken;
  setTokensFn = setTokens;
  onUnauthorized = onAuthError;
}

class ApiClientError extends Error {
  constructor(public status: number, public data: ApiError) {
    super(data.error?.message || 'API request failed');
    this.name = 'ApiClientError';
  }
}

async function attemptTokenRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const stored = getRefreshTokenFn?.();
        if (!stored) return false;
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: stored }),
        });
        if (!res.ok) return false;
        const tokens = await res.json();
        setTokensFn?.(tokens);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getTokenFn?.();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  // Token expired — try refresh once
  if (res.status === 401 && !isRetry && token) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      return request<T>(method, path, body, true);
    }
    onUnauthorized?.();
    const errorData = await res.json().catch(() => ({}));
    throw new ApiClientError(res.status, errorData as ApiError);
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiClientError(res.status, errorData as ApiError);
  }

  return res.json();
}

export function getAccessToken(): string | null {
  return getTokenFn?.() ?? null;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

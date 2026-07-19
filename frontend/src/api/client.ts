import type { ApiError } from '../types';

const BASE_URL = '/api';

let getTokenFn: (() => string | null) | null = null;
let onUnauthorized: (() => void) | null = null;

export function configureApiClient(getToken: () => string | null, onAuthError: () => void) {
  getTokenFn = getToken;
  onUnauthorized = onAuthError;
}

class ApiClientError extends Error {
  constructor(public status: number, public data: ApiError) {
    super(data.error?.message || 'API request failed');
    this.name = 'ApiClientError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
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

  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    const errorData = await res.json().catch(() => ({}));
    throw new ApiClientError(res.status, errorData as ApiError);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

import { api } from './client';
import type { User, AuthTokens } from '../types';

export function getCurrentUser(): Promise<User> {
  return api.get<User>('/auth/me');
}

export function refreshToken(token: string): Promise<AuthTokens> {
  return api.post<AuthTokens>('/auth/refresh', { refreshToken: token });
}

export function loginWithPassword(email: string, password: string): Promise<AuthTokens> {
  return api.post<AuthTokens>('/auth/login', { email, password });
}

export function getAuthMethod(): Promise<{ method: 'google' | 'userpass' }> {
  return api.get<{ method: 'google' | 'userpass' }>('/auth/method');
}

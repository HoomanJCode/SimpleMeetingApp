import { api } from './client';
import type { User, AuthTokens } from '../types';

export function getCurrentUser(): Promise<User> {
  return api.get<User>('/auth/me');
}

export function refreshToken(token: string): Promise<AuthTokens> {
  return api.post<AuthTokens>('/auth/refresh', { refreshToken: token });
}

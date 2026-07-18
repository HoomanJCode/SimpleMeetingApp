import { getDb } from '../db/connection';
import { getEnv } from '../config/env';
import { User, AuthTokens, JwtPayload } from '../types/models';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '../utils/jwt';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Generates the Google OAuth consent URL.
 */
export function getGoogleAuthUrl(state?: string): string {
  const env = getEnv();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  if (state) {
    params.set('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Exchanges the OAuth authorization code for Google tokens and user profile.
 */
async function exchangeCodeForTokens(code: string): Promise<{ tokens: GoogleTokenResponse; profile: GoogleUserInfo }> {
  const env = getEnv();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    logger.error({ status: tokenRes.status }, 'Failed to exchange OAuth code');
    throw new Error('Failed to exchange authorization code');
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    logger.error({ status: userRes.status }, 'Failed to fetch Google user info');
    throw new Error('Failed to fetch user info from Google');
  }

  const profile: GoogleUserInfo = await userRes.json();

  return { tokens, profile };
}

/**
 * Creates or updates a user from Google profile data.
 */
function createOrUpdateUser(profile: GoogleUserInfo): User {
  const db = getDb();

  const existing = db
    .prepare('SELECT * FROM users WHERE google_id = ?')
    .get(profile.sub) as User | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(profile.email, profile.name, profile.picture || null, existing.id);

    return {
      ...existing,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture || null,
      updatedAt: new Date().toISOString(),
    };
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, google_id, email, name, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, profile.sub, profile.email, profile.name, profile.picture || null, now, now);

  return {
    id,
    googleId: profile.sub,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture || null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Generates access and refresh tokens for a user.
 */
function generateTokens(user: User): AuthTokens {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  const env = getEnv();
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  ).toISOString();

  const db = getDb();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

/**
 * Handles the full Google OAuth callback flow.
 * Returns auth tokens on success.
 */
export async function handleGoogleCallback(code: string): Promise<AuthTokens> {
  const { profile } = await exchangeCodeForTokens(code);
  const user = createOrUpdateUser(profile);
  return generateTokens(user);
}

/**
 * Validates a refresh token and returns new auth tokens.
 * Rotates the refresh token (old one is deleted).
 */
export function refreshAccessToken(refreshToken: string): AuthTokens {
  const db = getDb();

  const row = db
    .prepare('SELECT * FROM refresh_tokens WHERE token = ?')
    .get(refreshToken) as { id: string; user_id: string; expires_at: string } | undefined;

  if (!row) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
    throw new UnauthorizedError('Refresh token has expired');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as User;

  if (!user) {
    throw new NotFoundError('User');
  }

  // Delete old refresh token
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);

  // Generate new tokens
  return generateTokens(user);
}

/**
 * Revokes a refresh token.
 */
export function revokeRefreshToken(token: string): void {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
}

/**
 * Gets a user by their ID.
 */
export function getUserById(userId: string): User {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

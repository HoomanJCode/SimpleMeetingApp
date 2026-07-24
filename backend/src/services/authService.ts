import { getDb } from '../db/connection';
import { getEnv } from '../config/env';
import { User, AuthTokens, JwtPayload } from '../types/models';
import { generateAccessToken, generateRefreshToken, hashToken, parseExpiration } from '../utils/jwt';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

// ---- Helper: map DB snake_case row to camelCase User ----

interface DbUserRow {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

function mapDbUser(row: DbUserRow): User {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- Google OAuth helpers ----

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

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  // Fetch user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    logger.error({ status: userRes.status }, 'Failed to fetch Google user info');
    throw new Error('Failed to fetch user info from Google');
  }

  const profile = (await userRes.json()) as GoogleUserInfo;

  return { tokens, profile };
}

// ---- User management ----

/**
 * Creates or updates a user from Google profile data.
 * Returns a properly mapped User object.
 */
function createOrUpdateUser(profile: GoogleUserInfo): User {
  const db = getDb();

  const existingRow = db
    .prepare('SELECT * FROM users WHERE google_id = ?')
    .get(profile.sub) as DbUserRow | undefined;

  if (existingRow) {
    db.prepare(
      `UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(profile.email, profile.name, profile.picture || null, existingRow.id);

    return {
      ...mapDbUser(existingRow),
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture || null,
      updatedAt: new Date().toISOString(),
    };
  }

  // Create new user
  const id = crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
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

// ---- Token management ----

/**
 * Generates access and refresh tokens for a user.
 * Stores the HASHED refresh token in the database.
 */
function generateTokens(user: User): AuthTokens {
  const env = getEnv();

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };

  const accessToken = generateAccessToken(payload);
  const rawRefreshToken = generateRefreshToken();
  const hashedToken = hashToken(rawRefreshToken);

  const expiresInMs = parseExpiration(env.REFRESH_TOKEN_EXPIRATION);
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

  const db = getDb();
  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, hashedToken, expiresAt);

  return { accessToken, refreshToken: rawRefreshToken };
}

// ---- Public API ----

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
 * Logs in (or auto-registers) a user with email + password.
 * Only available when AUTH_METHOD=userpass (dev/test mode).
 * The password is stored as a simple hash for dev use.
 */
export function loginWithEmailPassword(email: string, password: string): AuthTokens {
  const env = getEnv();
  if (env.AUTH_METHOD !== 'userpass') {
    throw new UnauthorizedError('Email/password login is not available');
  }

  const db = getDb();
  const passwordHash = hashToken(password);

  let dbUser = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as DbUserRow | undefined;

  if (dbUser) {
    // Verify password
    const storedHash = (
      db.prepare('SELECT password_hash FROM users WHERE id = ?').get(dbUser.id) as
        | { password_hash: string | null }
        | undefined
    )?.password_hash;

    if (storedHash && storedHash !== passwordHash) {
      throw new UnauthorizedError('Invalid password');
    }

    // Update password hash if not set (existing user from Google OAuth)
    if (!storedHash) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, dbUser.id);
    }

    return generateTokens(mapDbUser(dbUser));
  }

  // Auto-register new user
  const id = crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  const name = email.split('@')[0];

  db.prepare(
    `INSERT INTO users (id, google_id, email, name, password_hash, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
  ).run(id, `local_${id}`, email, name, passwordHash, now, now);

  const newUser: User = {
    id,
    googleId: `local_${id}`,
    email,
    name,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };

  return generateTokens(newUser);
}

/**
 * Validates a refresh token and returns new auth tokens.
 * Rotates the refresh token (old one is deleted).
 * Accepts the RAW refresh token, hashes it for DB lookup.
 */
export function refreshAccessToken(rawRefreshToken: string): AuthTokens {
  const db = getDb();
  const hashedToken = hashToken(rawRefreshToken);

  const row = db
    .prepare('SELECT * FROM refresh_tokens WHERE token = ?')
    .get(hashedToken) as { id: string; user_id: string; expires_at: string } | undefined;

  if (!row) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
    throw new UnauthorizedError('Refresh token has expired');
  }

  const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as DbUserRow | undefined;

  if (!dbUser) {
    throw new NotFoundError('User');
  }

  // Delete old refresh token (rotation)
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);

  // Generate new tokens
  return generateTokens(mapDbUser(dbUser));
}

/**
 * Revokes a refresh token.
 * Accepts the RAW token, hashes it for DB lookup.
 */
export function revokeRefreshToken(rawToken: string): void {
  const db = getDb();
  const hashedToken = hashToken(rawToken);
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(hashedToken);
}

/**
 * Gets a user by their ID.
 * Returns a properly mapped User object.
 */
export function getUserById(userId: string): User {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUserRow | undefined;

  if (!row) {
    throw new NotFoundError('User');
  }

  return mapDbUser(row);
}

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getEnv } from '../config/env';
import { JwtPayload } from '../types/models';

/**
 * Generates a short-lived JWT access token.
 */
export function generateAccessToken(payload: JwtPayload): string {
  const env = getEnv();
  // Cast options to work with newer @types/jsonwebtoken
  return jwt.sign(payload as object, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRATION as any,
  });
}

/**
 * Verifies and decodes a JWT access token.
 * Returns the payload or null if invalid/expired.
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  const env = getEnv();
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Generates a cryptographically random refresh token.
 * Returns the raw token (64-byte hex string, 128 characters).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hashes a refresh token for secure storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parses an expiration duration string (e.g. "30d", "7d", "24h") into milliseconds.
 * Defaults to 30 days if parsing fails.
 */
export function parseExpiration(expiration: string): number {
  const match = expiration.match(/^(\d+)\s*(d|h|m|s)$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}

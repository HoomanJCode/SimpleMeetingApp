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

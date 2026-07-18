import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getEnv } from '../config/env';
import { JwtPayload } from '../types/models';

/**
 * Generates a short-lived JWT access token.
 */
export function generateAccessToken(payload: JwtPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRATION,
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
 * Returns a 64-byte hex string (128 characters).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

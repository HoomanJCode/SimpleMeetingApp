import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { getDb } from '../db/connection';
import { runMigrations } from '../db/migrate';
import { hashToken, generateRefreshToken } from '../utils/jwt';
import {
  refreshAccessToken,
  revokeRefreshToken,
  getUserById,
} from './authService';
import { UnauthorizedError, NotFoundError } from '../utils/errors';

const testUserId = 'auth-test-u1';

beforeAll(() => {
  const db = getDb();
  runMigrations();

  // Seed test user
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(testUserId);
  if (!existing) {
    db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)').run(
      testUserId, 'auth-google-id', 'auth@test.com', 'Auth User'
    );
  }
});

beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens').run();
});

describe('AuthService', () => {
  describe('refreshAccessToken', () => {
    it('returns new tokens for a valid refresh token', () => {
      const rawToken = generateRefreshToken();
      const hashed = hashToken(rawToken);
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const db = getDb();
      db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
        testUserId, hashed, future
      );

      const result = refreshAccessToken(rawToken);
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe('string');
    });

    it('throws UnauthorizedError for invalid token', () => {
      expect(() => refreshAccessToken('invalid-token')).toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for expired token', () => {
      const rawToken = generateRefreshToken();
      const hashed = hashToken(rawToken);
      const past = new Date(Date.now() - 1000).toISOString();

      const db = getDb();
      db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
        testUserId, hashed, past
      );

      expect(() => refreshAccessToken(rawToken)).toThrow(UnauthorizedError);

      // Expired token should be deleted
      const stored = db.prepare('SELECT id FROM refresh_tokens WHERE token = ?').get(hashed);
      expect(stored).toBeUndefined();
    });

    it('rotates the old refresh token', () => {
      const rawToken = generateRefreshToken();
      const hashed = hashToken(rawToken);
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const db = getDb();
      db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
        testUserId, hashed, future
      );

      const result = refreshAccessToken(rawToken);

      // Old token should be deleted
      const oldStored = db.prepare('SELECT id FROM refresh_tokens WHERE token = ?').get(hashed);
      expect(oldStored).toBeUndefined();

      // New token should be stored
      const newHashed = hashToken(result.refreshToken);
      const newStored = db.prepare('SELECT id FROM refresh_tokens WHERE token = ?').get(newHashed);
      expect(newStored).toBeDefined();
    });
  });

  describe('revokeRefreshToken', () => {
    it('removes the token from the database', () => {
      const rawToken = generateRefreshToken();
      const hashed = hashToken(rawToken);
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const db = getDb();
      db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
        testUserId, hashed, future
      );

      revokeRefreshToken(rawToken);

      const stored = db.prepare('SELECT id FROM refresh_tokens WHERE token = ?').get(hashed);
      expect(stored).toBeUndefined();
    });

    it('does not throw for non-existent token', () => {
      expect(() => revokeRefreshToken('non-existent-token')).not.toThrow();
    });
  });

  describe('getUserById', () => {
    it('returns the user for a valid ID', () => {
      const user = getUserById(testUserId);
      expect(user.id).toBe(testUserId);
      expect(user.email).toBe('auth@test.com');
      expect(user.name).toBe('Auth User');
    });

    it('throws NotFoundError for invalid ID', () => {
      expect(() => getUserById('non-existent')).toThrow(NotFoundError);
    });
  });
});

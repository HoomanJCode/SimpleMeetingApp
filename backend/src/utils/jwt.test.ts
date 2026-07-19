import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyAccessToken, generateRefreshToken, hashToken } from './jwt';
import type { JwtPayload } from '../types/models';

const payload: JwtPayload = {
  sub: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  avatarUrl: null,
};

describe('JWT utilities', () => {
  describe('generateAccessToken', () => {
    it('returns a string token', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('returns the payload for a valid token', () => {
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.sub).toBe('user-1');
      expect(decoded!.email).toBe('alice@example.com');
    });

    it('returns null for an invalid token', () => {
      const result = verifyAccessToken('invalid.token.here');
      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('returns a 128-character hex string', () => {
      const token = generateRefreshToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(128);
    });
  });

  describe('hashToken', () => {
    it('returns a deterministic SHA-256 hash', () => {
      const token = 'test-token';
      const hash = hashToken(token);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
      // Same input = same output
      expect(hashToken(token)).toBe(hash);
    });

    it('produces different hashes for different inputs', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });
});

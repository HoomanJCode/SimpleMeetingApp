import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { runMigrations } from '../src/db/migrate';
import { getDb } from '../src/db/connection';
import { generateAccessToken, generateRefreshToken, hashToken } from '../src/utils/jwt';

const testUserId = 'auth-int-u1';

beforeAll(() => {
  runMigrations();

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(testUserId);
  if (!existing) {
    db.prepare(
      'INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)'
    ).run(testUserId, 'google-auth-int', 'auth@example.com', 'Auth Integration');
  }
});

beforeEach(() => {
  getDb().prepare('DELETE FROM refresh_tokens').run();
});

const app = createApp();

describe('Auth API integration', () => {
  describe('POST /api/auth/refresh', () => {
    it('returns new tokens for a valid refresh token', async () => {
      const rawToken = generateRefreshToken();
      const hashed = hashToken(rawToken);
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      getDb()
        .prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
        .run(testUserId, hashed, future);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: rawToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('returns 401 for an invalid refresh token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'totally-invalid-token' })
        .expect(401);
    });

    it('returns 401 for an expired refresh token', async () => {
      const rawToken = generateRefreshToken();
      const hashed = hashToken(rawToken);
      const past = new Date(Date.now() - 1000).toISOString();

      getDb()
        .prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
        .run(testUserId, hashed, past);

      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: rawToken })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 200 with user data when valid JWT is provided', async () => {
      const token = generateAccessToken({
        sub: testUserId,
        email: 'auth@example.com',
        name: 'Auth Integration',
        avatarUrl: null,
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: testUserId,
        email: 'auth@example.com',
        name: 'Auth Integration',
      });
    });

    it('returns 401 when no JWT is provided', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });
  });
});

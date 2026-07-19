import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authLimiter } from './rateLimiter';

describe('rateLimiter', () => {
  describe('authLimiter (max 10 per minute)', () => {
    it('allows requests under the limit', async () => {
      const app = express();
      app.use('/test', authLimiter, (_req, res) => res.json({ ok: true }));

      // Fire 10 requests — all should succeed
      for (let i = 0; i < 10; i++) {
        await request(app).get('/test').expect(200);
      }
    });

    it('blocks requests above the limit with 429', async () => {
      const app = express();
      app.use('/test', authLimiter, (_req, res) => res.json({ ok: true }));

      // Fire 10 requests to exhaust the limit
      for (let i = 0; i < 10; i++) {
        await request(app).get('/test');
      }

      // 11th request should be blocked
      const res = await request(app).get('/test').expect(429);

      expect(res.body).toMatchObject({
        error: {
          code: 'RATE_LIMITED',
          message: expect.any(String),
        },
      });
    });

    it('returns Retry-After header when rate limited', async () => {
      const app = express();
      app.use('/test', authLimiter, (_req, res) => res.json({ ok: true }));

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await request(app).get('/test');
      }

      const res = await request(app).get('/test').expect(429);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});

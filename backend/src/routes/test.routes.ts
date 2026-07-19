import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getEnv } from '../config/env';
import { getDb } from '../db/connection';
import { generateAccessToken, generateRefreshToken, hashToken, parseExpiration } from '../utils/jwt';
import { validate } from '../middleware/validate';

/**
 * Dev/test-only routes used by the Playwright E2E suite to seed users
 * without going through the real Google OAuth flow, and to reset DB
 * state between tests.
 *
 * The router is gated behind two conditions, both required:
 *   1. NODE_ENV !== 'production'
 *   2. ENABLE_TEST_ROUTES=1 set in the process environment
 *
 * This means the routes are completely inaccessible by default — even in
 * development unless explicitly opted in — and are always inaccessible
 * in production.
 */
const router = Router();

function guardTestRoutes(_req: Request, res: Response): boolean {
  const env = getEnv();
  if (env.NODE_ENV === 'production' || process.env.ENABLE_TEST_ROUTES !== '1') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    return false;
  }
  return true;
}

const loginSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
});

/**
 * POST /test/login
 * Upserts a user and returns valid access + refresh tokens.
 * Mirrors the real OAuth flow: the refresh token is hashed and persisted.
 */
router.post(
  '/login',
  validate({ body: loginSchema }),
  (req: Request, res: Response) => {
    if (!guardTestRoutes(req, res)) return;

    const { id, email, name, avatarUrl } = req.body as z.infer<typeof loginSchema>;
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, google_id, email, name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         avatar_url = excluded.avatar_url,
         updated_at = excluded.updated_at`
    ).run(id, `test_google_${id}`, email, name, avatarUrl ?? null, now, now);

    const accessToken = generateAccessToken({
      sub: id,
      email,
      name,
      avatarUrl: avatarUrl ?? null,
    });
    const rawRefreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const expiresAtMs = parseExpiration(getEnv().REFRESH_TOKEN_EXPIRATION);
    const expiresAt = new Date(Date.now() + expiresAtMs).toISOString();

    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(id, hashedRefreshToken, expiresAt);

    res.json({ accessToken, refreshToken: rawRefreshToken });
  }
);

/**
 * POST /test/reset
 * Truncates all domain tables while preserving the migration tracking table.
 * Use between tests for isolation.
 */
router.post('/reset', (_req: Request, res: Response) => {
  if (!guardTestRoutes(_req, res)) return;

  const db = getDb();
  db.exec(`
    DELETE FROM participants;
    DELETE FROM meetings;
    DELETE FROM refresh_tokens;
    DELETE FROM users;
  `);

  res.json({ ok: true });
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { getGoogleAuthUrl, handleGoogleCallback, refreshAccessToken, loginWithEmailPassword } from '../services/authService';
import { getEnv } from '../config/env';

export const authRouter = Router();

/**
 * GET /auth/method
 * Returns the configured auth method so the frontend can decide which
 * login UI to show (Google OAuth redirect vs email/password form).
 */
authRouter.get('/method', (_req: Request, res: Response) => {
  const env = getEnv();
  res.json({ method: env.AUTH_METHOD });
});

/**
 * POST /auth/login
 * Email/password login. Only available when AUTH_METHOD=userpass.
 * Auto-registers new users on first login.
 */
authRouter.post(
  '/login',
  authLimiter,
  validate({
    body: z.object({
      email: z.string().email('Valid email is required'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),
  (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const tokens = loginWithEmailPassword(email, password);
    res.json(tokens);
  }
);

/**
 * GET /auth/google
 * Redirects to Google OAuth consent screen.
 */
authRouter.get('/google', authLimiter, (_req: Request, res: Response) => {
  const url = getGoogleAuthUrl();
  res.redirect(url);
});

/**
 * GET /auth/google/callback
 * Handles the Google OAuth callback.
 * Exchanges the authorization code for tokens and redirects to the frontend.
 */
authRouter.get('/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Authorization code is required' },
    });
    return;
  }

  try {
    const { accessToken, refreshToken } = await handleGoogleCallback(code);
    const env = getEnv();
    res.redirect(
      `${env.FRONTEND_URL}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}`
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/refresh
 * Refreshes an expired access token using a refresh token.
 */
authRouter.post(
  '/refresh',
  authLimiter,
  validate({
    body: z.object({
      refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
  }),
  (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = refreshAccessToken(refreshToken);
    res.json(tokens);
  }
);

/**
 * GET /auth/me
 * Returns the currently authenticated user's profile.
 */
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json(req.user);
});

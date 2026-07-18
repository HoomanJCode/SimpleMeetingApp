import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

/**
 * Middleware that requires a valid JWT access token.
 * Attaches decoded user to `req.user` on success.
 * Calls next(err) on failure.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or invalid authorization header'));
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    next(new UnauthorizedError('Invalid or expired token'));
    return;
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl,
  };

  next();
}

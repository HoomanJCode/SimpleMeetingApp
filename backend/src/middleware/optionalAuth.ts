import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Middleware that optionally authenticates the user.
 * Attaches decoded user to `req.user` if a valid token is present.
 * Does NOT fail if no token or invalid token — just sets `req.user = undefined`.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (payload) {
      req.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.avatarUrl,
      };
    }
  }

  next();
}

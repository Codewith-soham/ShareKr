import type { RequestHandler } from 'express';
import { authService, type AuthService } from '../modules/auth/auth.service.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { ApiError } from '../utils/apiError.js';

const unauthorized = () => new ApiError(401, 'Authentication required', 'UNAUTHORIZED');

export const createAuthenticate =
  (service: Pick<AuthService, 'resolveSession'> = authService): RequestHandler =>
  async (req, _res, next) => {
    try {
      const header = req.get('authorization');
      const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
      const claims = token ? verifyAccessToken(token) : null;
      if (!claims) throw unauthorized();

      // Validates session, account status and token_version on every request,
      // so suspension takes effect immediately rather than at token expiry.
      const user = await service.resolveSession(claims.sid, claims.sub, claims.tv);
      if (!user) throw unauthorized();

      req.auth = { userId: user.id, sessionId: claims.sid, user };
      next();
    } catch (error) {
      next(error);
    }
  };

export const authenticate = createAuthenticate();

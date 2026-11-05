import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface AccessTokenClaims {
  sub: string; // user id
  sid: string; // session id
  tv: number; // user.tokenVersion at issue time
}

export const signAccessToken = (claims: AccessTokenClaims): string =>
  jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
  });

// Returns null for any invalid, expired or malformed token.
export const verifyAccessToken = (token: string): AccessTokenClaims | null => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    });
    if (
      typeof payload === 'object' &&
      typeof payload.sub === 'string' &&
      typeof payload.sid === 'string' &&
      typeof payload.tv === 'number'
    ) {
      return { sub: payload.sub, sid: payload.sid, tv: payload.tv };
    }
    return null;
  } catch {
    return null;
  }
};

export const generateRefreshToken = (): string => randomBytes(32).toString('base64url');

export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const refreshTtlMs = (): number => env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

interface LimiterOptions {
  windowMs: number;
  limit: number;
}

export const createRateLimiter = ({ windowMs, limit }: LimiterOptions) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new ApiError(429, 'Too many requests, please try again later', 'RATE_LIMITED'));
    },
  });

// Tests share one IP, so the limits are relaxed there.
// A dedicated test covers the limiter itself.
const relaxed = env.NODE_ENV === 'test';

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: relaxed ? 10_000 : 100,
});

// Tighter limit for endpoints that send email or accept OTP guesses.
export const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: relaxed ? 10_000 : 10,
});

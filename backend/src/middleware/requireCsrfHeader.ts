import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'sharekar';

// Defence in depth for cookie-authenticated routes (refresh, logout).
// The cookie is SameSite=Strict, and browsers will not send this custom header
// cross-site without a CORS preflight that our allowlist rejects.
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (req.get(CSRF_HEADER) !== CSRF_VALUE) {
    next(new ApiError(403, 'Missing required request header', 'CSRF_REJECTED'));
    return;
  }
  const origin = req.get('origin');
  if (origin && !env.corsOrigins.includes(origin)) {
    next(new ApiError(403, 'Origin not allowed', 'CSRF_REJECTED'));
    return;
  }
  next();
};

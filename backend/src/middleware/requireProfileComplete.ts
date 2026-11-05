import type { RequestHandler } from 'express';
import { ApiError } from '../utils/apiError.js';

// Gate for core features (pools etc.). Must run after `authenticate`.
// TODO: also require phone_verified_at once SMS verification replaces the email pilot.
export const requireProfileComplete: RequestHandler = (req, _res, next) => {
  if (!req.auth) {
    next(new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));
    return;
  }
  if (!req.auth.user.profileCompletedAt) {
    next(new ApiError(403, 'Complete your profile first', 'PROFILE_INCOMPLETE'));
    return;
  }
  next();
};

import { Router, type RequestHandler } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimit.js';
import { requireCsrfHeader } from '../../middleware/requireCsrfHeader.js';
import { validateBody } from '../../middleware/validate.js';
import { authController, type AuthController } from './auth.controller.js';
import { loginSchema, registerSchema, resendOtpSchema, verifyOtpSchema } from './auth.schemas.js';

// Dependencies are injectable so tests can mount the router with a fake service.
export const createAuthRouter = (
  controller: AuthController = authController,
  auth: RequestHandler = authenticate,
): Router => {
  const router = Router();
  router.use(authLimiter);

  router.post('/register', otpLimiter, validateBody(registerSchema), controller.register);
  router.post('/login', otpLimiter, validateBody(loginSchema), controller.login);
  router.post('/otp/send', otpLimiter, validateBody(resendOtpSchema), controller.resendOtp);
  router.post('/otp/verify', otpLimiter, validateBody(verifyOtpSchema), controller.verifyOtp);

  // Cookie-authenticated: require the CSRF header.
  router.post('/refresh', requireCsrfHeader, controller.refresh);
  router.post('/logout', requireCsrfHeader, auth, controller.logout);

  router.post('/logout-all', auth, controller.logoutAll);
  router.get('/me', auth, controller.me);

  return router;
};

export const authRoutes = createAuthRouter();

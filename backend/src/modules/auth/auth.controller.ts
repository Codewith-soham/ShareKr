import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  authService,
  toUserSummary,
  type AuthResult,
  type AuthService,
  type RequestMeta,
} from './auth.service.js';
import { refreshTtlMs } from './token.service.js';

export const REFRESH_COOKIE = 'sk_refresh';
const COOKIE_PATH = '/api/v1/auth';
const CODE_SENT = 'If the details are valid, a code has been sent';

export const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: COOKIE_PATH,
});

const metaFrom = (req: Request): RequestMeta => ({
  ipAddress: req.ip ?? null,
  userAgent: req.get('user-agent') ?? null,
});

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  private sendSession(res: Response, result: AuthResult, message: string) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...cookieOptions(),
      maxAge: refreshTtlMs(),
    });
    res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken: result.accessToken,
          expiresInSeconds: env.ACCESS_TOKEN_TTL_MINUTES * 60,
          user: result.user,
        },
        message,
      ),
    );
  }

  public register = asyncHandler(async (req: Request, res: Response) => {
    const { email, fullName } = req.body as { email: string; fullName: string };
    const data = await this.service.register(email, fullName, metaFrom(req));
    res.status(200).json(new ApiResponse(200, data, CODE_SENT));
  });

  public login = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    const data = await this.service.login(email, metaFrom(req));
    res.status(200).json(new ApiResponse(200, data, CODE_SENT));
  });

  public resendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { challengeId } = req.body as { challengeId: string };
    const data = await this.service.resend(challengeId, metaFrom(req));
    res.status(200).json(new ApiResponse(200, data, CODE_SENT));
  });

  public verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { challengeId, code } = req.body as { challengeId: string; code: string };
    const result = await this.service.verifyOtp(challengeId, code, metaFrom(req));
    this.sendSession(res, result, 'Verified successfully');
  });

  public refresh = asyncHandler(async (req: Request, res: Response) => {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    try {
      const result = await this.service.refresh(token, metaFrom(req));
      this.sendSession(res, result, 'Token refreshed');
    } catch (error) {
      if (error instanceof ApiError) res.clearCookie(REFRESH_COOKIE, cookieOptions());
      throw error;
    }
  });

  public logout = asyncHandler(async (req: Request, res: Response) => {
    await this.service.logout(req.auth!.sessionId);
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    res.status(200).json(new ApiResponse(200, null, 'Logged out'));
  });

  public logoutAll = asyncHandler(async (req: Request, res: Response) => {
    await this.service.revokeAllForUser(req.auth!.userId);
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    res.status(200).json(new ApiResponse(200, null, 'Logged out of all sessions'));
  });

  public me = asyncHandler(async (req: Request, res: Response) => {
    res
      .status(200)
      .json(new ApiResponse(200, { user: toUserSummary(req.auth!.user) }, 'Current user'));
  });
}

export const authController = new AuthController();

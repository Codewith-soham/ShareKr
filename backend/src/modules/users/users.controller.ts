import type { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { REFRESH_COOKIE, cookieOptions } from '../auth/auth.controller.js';
import { toUserSummary } from '../auth/auth.service.js';
import type { UpdateProfileInput } from './users.schemas.js';
import { usersService } from './users.service.js';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res
    .status(200)
    .json(new ApiResponse(200, { user: toUserSummary(req.auth!.user) }, 'Profile retrieved'));
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateProfile(req.auth!.userId, req.body as UpdateProfileInput);
  res.status(200).json(new ApiResponse(200, { user }, 'Profile updated'));
});

export const getUploadSignature = asyncHandler(async (req: Request, res: Response) => {
  const signature = usersService.getUploadSignature(req.auth!.userId);
  res.status(200).json(new ApiResponse(200, { upload: signature }, 'Upload signature created'));
});

export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  await usersService.deleteAccount(req.auth!.userId);
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.status(200).json(new ApiResponse(200, null, 'Account deactivated'));
});

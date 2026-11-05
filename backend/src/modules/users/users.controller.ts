import type { Request, Response } from 'express';
import { ApiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { toUserSummary } from '../auth/auth.service.js';
import { usersService, type ProfileInput } from './users.service.js';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res
    .status(200)
    .json(new ApiResponse(200, { user: toUserSummary(req.auth!.user) }, 'Profile retrieved'));
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.completeOrUpdateProfile(
    req.auth!.userId,
    req.body as ProfileInput,
  );
  res.status(200).json(new ApiResponse(200, { user }, 'Profile updated'));
});

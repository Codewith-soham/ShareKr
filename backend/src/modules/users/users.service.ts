import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { toUserSummary } from '../auth/auth.service.js';

export interface ProfileInput {
  fullName?: string;
  phone: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  profileImageUrl: string;
}

export class UsersService {
  async completeOrUpdateProfile(userId: string, input: ProfileInput) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Phone changes need OTP verification of the new number (not built yet).
    if (user.phone && user.phone !== input.phone) {
      throw new ApiError(
        409,
        'Changing a phone number requires verification and is not available yet',
        'PHONE_CHANGE_NOT_SUPPORTED',
      );
    }

    // Business rule: gender cannot change while the user has an active pool membership.
    if (user.gender && user.gender !== input.gender) {
      const active = await prisma.poolMember.count({
        where: { userId, status: 'ACTIVE' },
      });
      if (active > 0) {
        throw new ApiError(
          409,
          'Gender cannot be changed while you are in an active pool',
          'GENDER_CHANGE_BLOCKED',
        );
      }
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.fullName ? { fullName: input.fullName } : {}),
          phone: input.phone,
          gender: input.gender,
          profileImageUrl: input.profileImageUrl,
          profileCompletedAt: user.profileCompletedAt ?? new Date(),
        },
      });
      return toUserSummary(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(409, 'Phone number is already in use', 'PHONE_TAKEN');
      }
      throw error;
    }
  }
}

export const usersService = new UsersService();

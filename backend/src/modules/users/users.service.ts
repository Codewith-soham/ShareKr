import { Prisma, type User } from '../../generated/prisma/client.js';
import {
  createProfileUploadSignature,
  deleteImage,
  getStoredImageSize,
  PROFILE_IMAGE_MAX_BYTES,
  parseOwnProfileImageUrl,
  type UploadSignature,
} from '../../lib/cloudinary.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { toUserSummary, type UserSummary } from '../auth/auth.service.js';
import type { UpdateProfileInput } from './users.schemas.js';

type Tx = Prisma.TransactionClient;

// Locks this user's row until the transaction ends. Anything that depends on the user's
// state (gender change, delete, and later pool join/create) takes this lock first, so
// two requests for the same user can never act on stale data.
export const lockUser = async (tx: Tx, userId: string): Promise<User> => {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  return tx.user.findUniqueOrThrow({ where: { id: userId } });
};

const isProfileComplete = (user: Pick<User, 'fullName' | 'phone' | 'gender' | 'profileImageUrl'>) =>
  Boolean(user.fullName && user.phone && user.gender && user.profileImageUrl);

// Pools the user is still part of (as creator or active member). Account deletion and
// gender change are blocked while this is non-zero.
// TODO(Sprint 4-5): replace the "refuse" in deleteAccount with leave/cancel of these pools.
const countActivePools = async (tx: Tx, userId: string): Promise<number> => {
  const [asMember, asCreator] = await Promise.all([
    tx.poolMember.count({ where: { userId, status: 'ACTIVE' } }),
    tx.pool.count({ where: { creatorId: userId, status: { in: ['OPEN', 'READY'] } } }),
  ]);
  return asMember + asCreator;
};

export class UsersService {
  getUploadSignature(userId: string): UploadSignature {
    return createProfileUploadSignature(userId);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserSummary> {
    if (input.profileImageUrl && !parseOwnProfileImageUrl(input.profileImageUrl, userId)) {
      throw new ApiError(
        422,
        'Profile image must be uploaded through the app',
        'INVALID_PROFILE_IMAGE',
      );
    }

    if (input.profileImageUrl) {
      const publicId = parseOwnProfileImageUrl(input.profileImageUrl, userId)!;
      const size = await getStoredImageSize(input.profileImageUrl);
      if (size === null) {
        throw new ApiError(
          422,
          'Profile image was not found, upload it again',
          'INVALID_PROFILE_IMAGE',
        );
      }
      if (size > PROFILE_IMAGE_MAX_BYTES) {
        void deleteImage(publicId); // do not keep an oversized file
        throw new ApiError(422, 'Profile image must be 2 MB or smaller', 'PROFILE_IMAGE_TOO_LARGE');
      }
    }

    let previousImageUrl: string | null = null;
    let updated: User;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);

        // Phone changes need OTP verification of the new number (arrives with SMS support).
        if (input.phone && user.phone && user.phone !== input.phone) {
          throw new ApiError(
            409,
            'Changing a phone number requires verification and is not available yet',
            'PHONE_CHANGE_NOT_SUPPORTED',
          );
        }

        // Business rule: gender cannot change while in an active pool.
        if (input.gender && user.gender && user.gender !== input.gender) {
          if ((await countActivePools(tx, userId)) > 0) {
            throw new ApiError(
              409,
              'Gender cannot be changed while you are in an active pool',
              'GENDER_CHANGE_BLOCKED',
            );
          }
        }

        const merged = {
          fullName: input.fullName ?? user.fullName,
          phone: input.phone ?? user.phone,
          gender: input.gender ?? user.gender,
          profileImageUrl: input.profileImageUrl ?? user.profileImageUrl,
        };
        if (input.profileImageUrl && user.profileImageUrl !== input.profileImageUrl) {
          previousImageUrl = user.profileImageUrl;
        }

        return tx.user.update({
          where: { id: userId },
          data: {
            ...merged,
            // Set once, the first time every mandatory field is present. Never cleared.
            profileCompletedAt:
              user.profileCompletedAt ?? (isProfileComplete(merged) ? new Date() : null),
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(409, 'Phone number is already in use', 'PHONE_TAKEN');
      }
      throw error;
    }

    // Cleanup after the DB commit, best effort: an orphaned image is harmless.
    if (previousImageUrl) {
      const publicId = parseOwnProfileImageUrl(previousImageUrl, userId);
      if (publicId) void deleteImage(publicId);
    }
    return toUserSummary(updated);
  }

  // Stage 1 of account deletion: deactivate now, wipe personal data after the retention
  // period (see jobs/account-anonymize.ts). Sessions are revoked in the same transaction.
  async deleteAccount(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);

      if ((await countActivePools(tx, userId)) > 0) {
        throw new ApiError(
          409,
          'Leave or cancel your active pool before deleting your account',
          'ACTIVE_POOL_EXISTS',
        );
      }

      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          accountStatus: 'DEACTIVATED',
          deletedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
      });
    });
  }
}

export const usersService = new UsersService();

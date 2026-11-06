import { env } from '../config/env.js';
import { deleteProfileFolder } from '../lib/cloudinary.js';
import { prisma } from '../lib/prisma.js';

const INTERVAL_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Stage 2 of account deletion. Accounts deactivated more than `retentionDays` ago have
// their personal data wiped. The row stays, so pool history and audit records still point
// at a valid (anonymous) user. Safe to run repeatedly: already-anonymized rows are skipped.
export const anonymizeDeletedAccounts = async (
  now: Date = new Date(),
  retentionDays: number = env.ACCOUNT_RETENTION_DAYS,
): Promise<number> => {
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  const due = await prisma.user.findMany({
    where: {
      accountStatus: 'DEACTIVATED',
      deletedAt: { not: null, lte: cutoff },
      NOT: { email: { startsWith: 'deleted+' } },
    },
    select: { id: true },
  });

  for (const { id } of due) {
    await prisma.user.update({
      where: { id },
      data: {
        email: `deleted+${id}@invalid.local`,
        fullName: 'Deleted user',
        phone: null,
        googleSubject: null,
        passwordHash: null,
        profileImageUrl: null,
        gender: null,
        phoneVerifiedAt: null,
      },
    });
    // After the DB is wiped. A failed image cleanup is logged and never blocks anonymization.
    await deleteProfileFolder(id);
  }
  return due.length;
};

// Daily job. Returns a stop function.
export const startAccountAnonymizeJob = (): (() => void) => {
  const run = () => {
    anonymizeDeletedAccounts().catch((error: unknown) => {
      console.error(
        'Account anonymization failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    });
  };
  run();
  const timer = setInterval(run, INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
};

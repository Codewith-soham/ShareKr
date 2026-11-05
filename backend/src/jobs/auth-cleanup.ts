import { PrismaAuthRepository } from '../modules/auth/auth.repository.js';

const INTERVAL_MS = 60 * 60 * 1000;

// Hourly purge of expired OTP challenges and sessions. Returns a stop function.
export const startAuthCleanupJob = (
  repo: Pick<PrismaAuthRepository, 'deleteExpired'> = new PrismaAuthRepository(),
): (() => void) => {
  const run = () => {
    repo.deleteExpired(new Date()).catch((error: unknown) => {
      console.error(
        'Auth cleanup failed:',
        error instanceof Error ? error.message : 'unknown error',
      );
    });
  };
  run();
  const timer = setInterval(run, INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
};

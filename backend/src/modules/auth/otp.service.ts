import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 5;

export const generateOtpCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

// HMAC with a server-side pepper: a plain hash of a 6-digit code is
// trivially brute-forceable if the table leaks.
export const hashOtp = (code: string): string =>
  createHmac('sha256', env.OTP_PEPPER).update(code).digest('hex');

export const verifyOtpHash = (code: string, expectedHash: string): boolean => {
  const actual = Buffer.from(hashOtp(code), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

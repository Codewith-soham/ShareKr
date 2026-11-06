import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(255).pipe(z.email());

export const registerSchema = z.strictObject({
  email,
  fullName: z.string().trim().min(2).max(120),
});

export const loginSchema = z.strictObject({ email });

export const resendOtpSchema = z.strictObject({ challengeId: z.uuid() });

export const verifyOtpSchema = z.strictObject({
  challengeId: z.uuid(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

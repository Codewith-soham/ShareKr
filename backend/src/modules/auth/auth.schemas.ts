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

export const completeProfileSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in international format, e.g. +919876543210'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  profileImageUrl: z.url().max(2048),
});

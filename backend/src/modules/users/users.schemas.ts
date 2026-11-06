import { z } from 'zod';

// PATCH /users/me: every field is optional, but at least one must be sent.
// The profile counts as "complete" once name, phone, gender and image are all set.
export const updateProfileSchema = z
  .strictObject({
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in international format, e.g. +919876543210')
      .optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
    profileImageUrl: z.url().max(2048).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Send at least one field to update' });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// DELETE /users/me: the user must type the word, so a stray click cannot delete an account.
export const deleteAccountSchema = z.strictObject({
  confirm: z.literal('DELETE'),
});

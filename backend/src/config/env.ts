import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().min(1),

  // Secrets: generate each with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
  JWT_ACCESS_SECRET: z.string().min(32),
  OTP_PEPPER: z.string().min(32),

  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),

  // Comma-separated list of allowed frontend origins.
  CORS_ORIGINS: z.string().min(1).default('http://localhost:5173'),
  COOKIE_SECURE: booleanFromString.default(false),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  // "console" prints OTPs to the server log (dev only). "smtp" sends real email.
  OTP_DELIVERY: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromString.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${problems}`);
}

const data = parsed.data;

if (data.OTP_DELIVERY === 'smtp' && (!data.SMTP_HOST || !data.EMAIL_FROM)) {
  throw new Error('OTP_DELIVERY=smtp requires SMTP_HOST and EMAIL_FROM to be set');
}

if (data.NODE_ENV === 'production') {
  if (data.OTP_DELIVERY === 'console') {
    throw new Error('OTP_DELIVERY=console is not allowed in production');
  }
  if (!data.COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true in production');
  }
}

export const env = {
  ...data,
  corsOrigins: data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

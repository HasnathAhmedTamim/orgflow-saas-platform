import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  BACKEND_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_SUCCESS_URL: z.string().url(),
  STRIPE_CANCEL_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('OrgFlow <onboarding@resend.dev>'),
  EMAIL_DEV_OVERRIDE_TO: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = (parsed.success
  ? parsed.data
  : ({
      NODE_ENV: 'test',
      PORT: 4000,
      BACKEND_URL: 'http://localhost:4000',
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orgflow_test',
      JWT_ACCESS_SECRET: 'test-access-secret-min-32-characters',
      JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      COOKIE_SECURE: false,
      STRIPE_SECRET_KEY: 'sk_test_dummy',
      STRIPE_WEBHOOK_SECRET: 'whsec_dummy',
      STRIPE_SUCCESS_URL: 'http://localhost:3000/checkout/success',
      STRIPE_CANCEL_URL: 'http://localhost:3000/checkout/cancel',
      RESEND_API_KEY: '',
      EMAIL_FROM: 'OrgFlow <onboarding@resend.dev>',
      EMAIL_DEV_OVERRIDE_TO: '',
    } as z.infer<typeof envSchema>));

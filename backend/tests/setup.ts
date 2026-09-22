import { PrismaClient } from '@prisma/client';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.BACKEND_URL = 'http://localhost:4000';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.STRIPE_SUCCESS_URL = 'http://localhost:3000/checkout/success';
process.env.STRIPE_CANCEL_URL = 'http://localhost:3000/checkout/cancel';
process.env.COOKIE_SECURE = 'false';
process.env.EMAIL_FROM = 'OrgFlow <test@orgflow.test>';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/orgflow_test?schema=public';

export const testPrisma = new PrismaClient();

import { z } from 'zod';

export const registerSchema = z.object({
  organizationName: z.string().min(2).max(120),
  adminName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  planId: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  billingEmail: z.string().email().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ORG_ADMIN', 'MEMBER']).default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ORG_ADMIN', 'MEMBER']),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(128),
});

export const planSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().positive(),
  currency: z.string().length(3).default('usd'),
  interval: z.enum(['MONTHLY', 'YEARLY']),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().optional(),
});

export const updatePlanSchema = planSchema.partial();

export const orgStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL']),
});

export const checkoutPlanSchema = z.object({
  planId: z.string().min(1),
});

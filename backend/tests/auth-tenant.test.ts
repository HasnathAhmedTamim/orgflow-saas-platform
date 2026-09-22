import request from 'supertest';
import bcrypt from 'bcryptjs';
import {
  OrgStatus,
  Role,
  UserStatus,
  BillingInterval,
  SubscriptionStatus,
  PaymentStatus,
  TransactionStatus,
} from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

const app = createApp();

async function seedMinimal() {
  await prisma.webhookEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.pendingRegistration.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.plan.deleteMany();

  const plan = await prisma.plan.create({
    data: {
      name: 'Test Plan',
      priceCents: 1000,
      currency: 'usd',
      interval: BillingInterval.MONTHLY,
      features: ['a'],
      isActive: true,
    },
  });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  await prisma.user.create({
    data: {
      email: 'platform.admin@test.com',
      name: 'Platform',
      passwordHash,
      role: Role.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const orgA = await prisma.organization.create({
    data: { name: 'Org A', status: OrgStatus.ACTIVE, billingEmail: 'a@test.com' },
  });
  const orgB = await prisma.organization.create({
    data: { name: 'Org B', status: OrgStatus.ACTIVE, billingEmail: 'b@test.com' },
  });

  const adminA = await prisma.user.create({
    data: {
      email: 'admin.a@test.com',
      name: 'Admin A',
      passwordHash,
      role: Role.ORG_ADMIN,
      organizationId: orgA.id,
    },
  });

  const memberA = await prisma.user.create({
    data: {
      email: 'member.a@test.com',
      name: 'Member A',
      passwordHash,
      role: Role.MEMBER,
      organizationId: orgA.id,
    },
  });

  const adminB = await prisma.user.create({
    data: {
      email: 'admin.b@test.com',
      name: 'Admin B',
      passwordHash,
      role: Role.ORG_ADMIN,
      organizationId: orgB.id,
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: orgA.id,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: orgA.id,
      amountCents: 1000,
      status: PaymentStatus.SUCCEEDED,
      description: 'A payment',
    },
  });

  await prisma.transaction.create({
    data: {
      organizationId: orgA.id,
      amountCents: 1000,
      status: TransactionStatus.SUCCESS,
      type: 'REGISTRATION_PAYMENT',
    },
  });

  await prisma.transaction.create({
    data: {
      organizationId: orgB.id,
      amountCents: 2000,
      status: TransactionStatus.SUCCESS,
      type: 'REGISTRATION_PAYMENT',
    },
  });

  return { plan, orgA, orgB, adminA, memberA, adminB };
}

async function login(email: string, password = 'Password123!') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

describe('OrgFlow API', () => {
  beforeAll(async () => {
    await seedMinimal();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('logs in with valid credentials', async () => {
      const res = await login('admin.a@test.com');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin.a@test.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('rejects invalid login', async () => {
      const res = await login('admin.a@test.com', 'wrong');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('protects authenticated routes', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns current user when authenticated', async () => {
      const loginRes = await login('admin.a@test.com');
      const cookies = loginRes.headers['set-cookie'];
      const res = await request(app).get('/api/auth/me').set('Cookie', cookies);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin.a@test.com');
    });
  });

  describe('Authorization', () => {
    it('allows platform admin to access admin stats', async () => {
      const loginRes = await login('platform.admin@test.com');
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', loginRes.headers['set-cookie']);
      expect(res.status).toBe(200);
      expect(res.body.data.totalOrganizations).toBeGreaterThanOrEqual(2);
    });

    it('blocks org admin from platform admin routes', async () => {
      const loginRes = await login('admin.a@test.com');
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', loginRes.headers['set-cookie']);
      expect(res.status).toBe(403);
    });

    it('blocks member from billing and members', async () => {
      const loginRes = await login('member.a@test.com');
      const cookie = loginRes.headers['set-cookie'];

      const payments = await request(app).get('/api/payments').set('Cookie', cookie);
      expect(payments.status).toBe(403);

      const members = await request(app)
        .get('/api/organizations/me/members')
        .set('Cookie', cookie);
      expect(members.status).toBe(403);

      const tx = await request(app).get('/api/transactions').set('Cookie', cookie);
      expect(tx.status).toBe(403);
    });
  });

  describe('Tenant isolation', () => {
    it('org A admin only sees org A transactions', async () => {
      const loginRes = await login('admin.a@test.com');
      const res = await request(app)
        .get('/api/transactions')
        .set('Cookie', loginRes.headers['set-cookie']);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const t of res.body.data) {
        expect(t.organizationId).toBeDefined();
      }
      const ids = new Set(res.body.data.map((t: { organizationId: string }) => t.organizationId));
      expect(ids.size).toBe(1);
    });

    it('org A cannot access org B via admin org detail', async () => {
      const { orgB } = await seedMinimal();
      const loginRes = await login('admin.a@test.com');
      const res = await request(app)
        .get(`/api/admin/organizations/${orgB.id}`)
        .set('Cookie', loginRes.headers['set-cookie']);
      expect(res.status).toBe(403);
    });
  });

  describe('Suspension', () => {
    it('blocks login when organization is suspended', async () => {
      const { orgA } = await seedMinimal();
      await prisma.organization.update({
        where: { id: orgA.id },
        data: { status: OrgStatus.SUSPENDED },
      });
      const res = await login('admin.a@test.com');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
      await prisma.organization.update({
        where: { id: orgA.id },
        data: { status: OrgStatus.ACTIVE },
      });
    });
  });
});

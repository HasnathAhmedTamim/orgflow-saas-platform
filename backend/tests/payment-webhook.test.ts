import {
  BillingInterval,
  OrgStatus,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  TransactionStatus,
  UserStatus,
} from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { paymentService } from '../src/modules/payments/payment.service';
import { webhookService } from '../src/modules/payments/webhook.service';
import Stripe from 'stripe';

jest.mock('../src/integrations/email/email.service', () => ({
  emailService: {
    sendPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
    sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
    sendSubscriptionChanged: jest.fn().mockResolvedValue(undefined),
    sendInvitation: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendSubscriptionExpiringSoon: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Payment webhook idempotency and rollback', () => {
  beforeAll(async () => {
    await prisma.webhookEvent.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.pendingRegistration.deleteMany();
    await prisma.plan.deleteMany();

    await prisma.plan.create({
      data: {
        id: 'plan_test_1',
        name: 'Webhook Plan',
        priceCents: 2500,
        currency: 'usd',
        interval: BillingInterval.MONTHLY,
        features: [],
        isActive: true,
      },
    });

    await prisma.pendingRegistration.create({
      data: {
        id: 'pending_1',
        organizationName: 'Webhook Org',
        adminName: 'Webhook Admin',
        adminEmail: 'webhook.admin@test.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.YqKzqKzqK',
        planId: 'plan_test_1',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function buildSession(id = 'cs_test_unique_1'): Stripe.Checkout.Session {
    return {
      id,
      object: 'checkout.session',
      amount_total: 2500,
      currency: 'usd',
      customer: 'cus_test_1',
      subscription: 'sub_test_1',
      payment_intent: 'pi_test_1',
      payment_status: 'paid',
      status: 'complete',
      metadata: {
        type: 'registration',
        pendingRegistrationId: 'pending_1',
        planId: 'plan_test_1',
      },
    } as unknown as Stripe.Checkout.Session;
  }

  it('activates organization atomically on checkout.session.completed', async () => {
    const session = buildSession('cs_test_unique_1');
    const event = {
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: session },
    } as Stripe.Event;

    const first = await webhookService.handleEvent(event);
    expect(first.duplicate).toBe(false);

    const org = await prisma.organization.findFirst({
      where: { name: 'Webhook Org' },
      include: { users: true, subscriptions: true, payments: true, transactions: true },
    });
    expect(org).not.toBeNull();
    expect(org!.status).toBe(OrgStatus.ACTIVE);
    expect(org!.users[0].role).toBe(Role.ORG_ADMIN);
    expect(org!.subscriptions[0].status).toBe(SubscriptionStatus.ACTIVE);
    expect(org!.payments[0].status).toBe(PaymentStatus.SUCCEEDED);
    expect(org!.transactions[0].status).toBe(TransactionStatus.SUCCESS);
  });

  it('does not duplicate effects for the same webhook event', async () => {
    const session = buildSession('cs_test_unique_1');
    const event = {
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: session },
    } as Stripe.Event;

    const second = await webhookService.handleEvent(event);
    expect(second.duplicate).toBe(true);

    const orgCount = await prisma.organization.count({ where: { name: 'Webhook Org' } });
    expect(orgCount).toBe(1);
    const paymentCount = await prisma.payment.count({
      where: { stripeCheckoutSessionId: 'cs_test_unique_1' },
    });
    expect(paymentCount).toBe(1);
  });

  it('rolls back all related writes when a transaction step fails', async () => {
    await prisma.pendingRegistration.create({
      data: {
        id: 'pending_rollback',
        organizationName: 'Rollback Org',
        adminName: 'Rollback Admin',
        adminEmail: 'rollback@test.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.YqKzqKzqK',
        planId: 'plan_test_1',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // Force failure: create a user with the same email before activation
    await prisma.user.create({
      data: {
        email: 'rollback@test.com',
        name: 'Existing',
        passwordHash: 'x',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      },
    });

    const session = buildSession('cs_test_rollback');
    session.metadata = {
      type: 'registration',
      pendingRegistrationId: 'pending_rollback',
      planId: 'plan_test_1',
    };

    await expect(paymentService.activateFromCheckoutSession(session)).rejects.toThrow();

    const org = await prisma.organization.findFirst({ where: { name: 'Rollback Org' } });
    expect(org).toBeNull();

    const payment = await prisma.payment.findFirst({
      where: { stripeCheckoutSessionId: 'cs_test_rollback' },
    });
    expect(payment).toBeNull();

    // cleanup colliding user
    await prisma.user.deleteMany({ where: { email: 'rollback@test.com' } });
    await prisma.pendingRegistration.deleteMany({ where: { id: 'pending_rollback' } });
  });
});

import {
  BillingInterval,
  OrgStatus,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  TransactionStatus,
  UserStatus,
} from '@prisma/client';
import request from 'supertest';
import Stripe from 'stripe';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { paymentService } from '../src/modules/payments/payment.service';
import { webhookService } from '../src/modules/payments/webhook.service';

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

const app = createApp();
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

describe('Payment webhook idempotency, rollback, renewal, refund', () => {
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

    const recorded = await prisma.webhookEvent.findUnique({ where: { stripeEventId: 'evt_test_1' } });
    expect(recorded).not.toBeNull();
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

  it('does not record webhook event when activation fails (retry can succeed)', async () => {
    await prisma.pendingRegistration.create({
      data: {
        id: 'pending_retry',
        organizationName: 'Retry Org',
        adminName: 'Retry Admin',
        adminEmail: 'retry.admin@test.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.YqKzqKzqK',
        planId: 'plan_test_1',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await prisma.user.create({
      data: {
        email: 'retry.admin@test.com',
        name: 'Blocker',
        passwordHash: 'x',
        role: Role.MEMBER,
        status: UserStatus.ACTIVE,
      },
    });

    const session = buildSession('cs_test_retry');
    session.metadata = {
      type: 'registration',
      pendingRegistrationId: 'pending_retry',
      planId: 'plan_test_1',
    };
    session.payment_intent = 'pi_retry_1';
    session.subscription = 'sub_retry_1';
    session.customer = 'cus_retry_1';

    const event = {
      id: 'evt_retry_1',
      type: 'checkout.session.completed',
      data: { object: session },
    } as Stripe.Event;

    await expect(webhookService.handleEvent(event)).rejects.toThrow();

    const recorded = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: 'evt_retry_1' },
    });
    expect(recorded).toBeNull();

    await prisma.user.deleteMany({ where: { email: 'retry.admin@test.com' } });

    const retried = await webhookService.handleEvent(event);
    expect(retried.duplicate).toBe(false);

    const org = await prisma.organization.findFirst({ where: { name: 'Retry Org' } });
    expect(org).not.toBeNull();
    expect(org!.status).toBe(OrgStatus.ACTIVE);
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

    await prisma.user.deleteMany({ where: { email: 'rollback@test.com' } });
    await prisma.pendingRegistration.deleteMany({ where: { id: 'pending_rollback' } });
  });

  it('records renewal payment on invoice.paid and syncs period', async () => {
    const org = await prisma.organization.findFirst({ where: { name: 'Webhook Org' } });
    expect(org).not.toBeNull();

    const sub = await prisma.subscription.findFirst({
      where: { organizationId: org!.id, stripeSubscriptionId: 'sub_test_1' },
    });
    expect(sub).not.toBeNull();

    const periodStart = Math.floor(Date.now() / 1000);
    const periodEnd = periodStart + 30 * 24 * 60 * 60;

    const invoice = {
      id: 'in_renew_1',
      object: 'invoice',
      amount_paid: 2500,
      amount_due: 2500,
      currency: 'usd',
      billing_reason: 'subscription_cycle',
      subscription: 'sub_test_1',
      payment_intent: 'pi_renew_1',
      lines: {
        data: [{ period: { start: periodStart, end: periodEnd } }],
      },
    } as unknown as Stripe.Invoice;

    const event = {
      id: 'evt_renew_1',
      type: 'invoice.paid',
      data: { object: invoice },
    } as Stripe.Event;

    await webhookService.handleEvent(event);

    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: 'pi_renew_1' },
    });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe(PaymentStatus.SUCCEEDED);

    const tx = await prisma.transaction.findFirst({
      where: { paymentId: payment!.id },
    });
    expect(tx?.type).toBe('SUBSCRIPTION_RENEWAL');
    expect(tx?.status).toBe(TransactionStatus.SUCCESS);

    const updatedSub = await prisma.subscription.findUnique({ where: { id: sub!.id } });
    expect(updatedSub!.status).toBe(SubscriptionStatus.ACTIVE);
    expect(updatedSub!.currentPeriodEnd?.getTime()).toBe(periodEnd * 1000);
  });

  it('marks payment and transactions REFUNDED on charge.refunded', async () => {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: 'pi_renew_1' },
    });
    expect(payment).not.toBeNull();

    const charge = {
      id: 'ch_refund_1',
      object: 'charge',
      payment_intent: 'pi_renew_1',
    } as unknown as Stripe.Charge;

    await webhookService.handleEvent({
      id: 'evt_refund_1',
      type: 'charge.refunded',
      data: { object: charge },
    } as Stripe.Event);

    const refunded = await prisma.payment.findUnique({ where: { id: payment!.id } });
    expect(refunded!.status).toBe(PaymentStatus.REFUNDED);

    const txs = await prisma.transaction.findMany({ where: { paymentId: payment!.id } });
    expect(txs.every((t) => t.status === TransactionStatus.REFUNDED)).toBe(true);
  });

  it('accepts a signed HTTP webhook through the Express endpoint', async () => {
    await prisma.pendingRegistration.create({
      data: {
        id: 'pending_http',
        organizationName: 'HTTP Webhook Org',
        adminName: 'HTTP Admin',
        adminEmail: 'http.webhook@test.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.YqKzqKzqK',
        planId: 'plan_test_1',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const session = {
      id: 'cs_http_1',
      object: 'checkout.session',
      amount_total: 2500,
      currency: 'usd',
      customer: 'cus_http_1',
      subscription: 'sub_http_1',
      payment_intent: 'pi_http_1',
      payment_status: 'paid',
      status: 'complete',
      metadata: {
        type: 'registration',
        pendingRegistrationId: 'pending_http',
        planId: 'plan_test_1',
      },
    };

    const eventPayload = {
      id: 'evt_http_signed_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: session },
    };

    const payload = JSON.stringify(eventPayload);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.duplicate).toBe(false);

    const org = await prisma.organization.findFirst({ where: { name: 'HTTP Webhook Org' } });
    expect(org).not.toBeNull();
    expect(org!.status).toBe(OrgStatus.ACTIVE);

    const recorded = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: 'evt_http_signed_1' },
    });
    expect(recorded).not.toBeNull();

    // Replay with same signature/event must be idempotent
    const replay = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);

    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);
  });

  it('rejects HTTP webhook with invalid signature', async () => {
    const payload = JSON.stringify({
      id: 'evt_bad_sig',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: {} },
    });

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=invalid')
      .send(payload);

    expect(res.status).toBe(401);
  });
});

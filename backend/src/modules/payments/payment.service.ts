import {
  OrgStatus,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  TransactionStatus,
  UserStatus,
} from '@prisma/client';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { emailService } from '../../integrations/email/email.service';
import { stripe } from '../../integrations/stripe/stripe.client';
import { AuthUser, assertTenantAccess } from '../../middlewares/auth.middleware';
import { hashPassword } from '../../utils/crypto';
import { errors } from '../../utils/errors';

function moneyLabel(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export class PaymentService {
  /**
   * Paid onboarding: store pending registration, create Stripe Checkout, do not activate org yet.
   */
  async startRegistration(input: {
    organizationName: string;
    adminName: string;
    email: string;
    password: string;
    planId: string;
  }) {
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw errors.conflict('Email already registered');

    const plan = await prisma.plan.findFirst({
      where: { id: input.planId, isActive: true },
    });
    if (!plan) throw errors.notFound('Plan not found');

    const passwordHash = await hashPassword(input.password);

    const pending = await prisma.pendingRegistration.create({
      data: {
        organizationName: input.organizationName,
        adminName: input.adminName,
        adminEmail: email,
        passwordHash,
        planId: plan.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            unit_amount: plan.priceCents,
            recurring: {
              interval: plan.interval === 'YEARLY' ? 'year' : 'month',
            },
            product_data: {
              name: plan.name,
              description: plan.description ?? undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.STRIPE_CANCEL_URL}?pending_id=${pending.id}`,
      metadata: {
        type: 'registration',
        pendingRegistrationId: pending.id,
        planId: plan.id,
      },
      subscription_data: {
        metadata: {
          type: 'registration',
          pendingRegistrationId: pending.id,
          planId: plan.id,
        },
      },
    });

    await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return {
      pendingRegistrationId: pending.id,
      checkoutUrl: session.url,
      sessionId: session.id,
      plan: {
        id: plan.id,
        name: plan.name,
        priceCents: plan.priceCents,
        interval: plan.interval,
        currency: plan.currency,
      },
    };
  }

  async retryRegistrationCheckout(pendingId: string) {
    const pending = await prisma.pendingRegistration.findUnique({
      where: { id: pendingId },
    });
    if (!pending || pending.expiresAt < new Date()) {
      throw errors.notFound('Pending registration not found or expired');
    }

    const plan = await prisma.plan.findFirst({
      where: { id: pending.planId, isActive: true },
    });
    if (!plan) throw errors.notFound('Plan not found');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: pending.adminEmail,
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            unit_amount: plan.priceCents,
            recurring: {
              interval: plan.interval === 'YEARLY' ? 'year' : 'month',
            },
            product_data: { name: plan.name },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.STRIPE_CANCEL_URL}?pending_id=${pending.id}`,
      metadata: {
        type: 'registration',
        pendingRegistrationId: pending.id,
        planId: plan.id,
      },
    });

    await prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async getMySubscription(user: AuthUser) {
    if (!user.organizationId) throw errors.notFound();
    assertTenantAccess(user, user.organizationId);

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: user.organizationId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return subscription;
  }

  async createPlanChangeCheckout(user: AuthUser, planId: string, action: 'upgrade' | 'downgrade') {
    if (user.role !== Role.ORG_ADMIN) throw errors.forbidden();
    if (!user.organizationId) throw errors.notFound();

    const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw errors.notFound('Plan not found');

    const current = await prisma.subscription.findFirst({
      where: { organizationId: user.organizationId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });
    if (!current) throw errors.notFound('No active subscription');

    if (action === 'upgrade' && plan.priceCents <= current.plan.priceCents) {
      throw errors.validation('Selected plan is not an upgrade');
    }
    if (action === 'downgrade' && plan.priceCents >= current.plan.priceCents) {
      throw errors.validation('Selected plan is not a downgrade');
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: org.stripeCustomerId ?? undefined,
      customer_email: org.stripeCustomerId ? undefined : org.billingEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            unit_amount: plan.priceCents,
            recurring: {
              interval: plan.interval === 'YEARLY' ? 'year' : 'month',
            },
            product_data: { name: plan.name },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/organization/subscription`,
      metadata: {
        type: action,
        organizationId: org.id,
        planId: plan.id,
        previousSubscriptionId: current.id,
      },
    });

    // Pending rows so abandoned/expired checkout can be marked ROLLED_BACK.
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          organizationId: org.id,
          amountCents: plan.priceCents,
          currency: plan.currency,
          status: PaymentStatus.PENDING,
          stripeCheckoutSessionId: session.id,
          description: `${action} pending — ${plan.name}`,
        },
      });
      await tx.transaction.create({
        data: {
          organizationId: org.id,
          paymentId: payment.id,
          amountCents: plan.priceCents,
          currency: plan.currency,
          status: TransactionStatus.PENDING,
          type: action === 'upgrade' ? 'PLAN_UPGRADE' : 'PLAN_DOWNGRADE',
          description: `Pending subscription ${action} to ${plan.name}`,
          metadata: { sessionId: session.id },
        },
      });
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async cancelSubscription(user: AuthUser) {
    if (user.role !== Role.ORG_ADMIN) throw errors.forbidden();
    if (!user.organizationId) throw errors.notFound();

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: user.organizationId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true, organization: true },
    });
    if (!subscription) throw errors.notFound('No active subscription');

    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        status: SubscriptionStatus.CANCELLED,
      },
      include: { plan: true },
    });

    const notifyEmail =
      subscription.organization.billingEmail ||
      (await prisma.user.findFirst({
        where: { organizationId: user.organizationId, role: Role.ORG_ADMIN },
      }))?.email;

    if (notifyEmail) {
      await emailService.sendSubscriptionChanged(
        notifyEmail,
        subscription.organization.name,
        'cancelled',
        subscription.plan.name,
      );
    }

    return updated;
  }

  async listPayments(user: AuthUser) {
    if (!user.organizationId) throw errors.notFound();
    if (user.role === Role.MEMBER) throw errors.forbidden();
    assertTenantAccess(user, user.organizationId);

    return prisma.payment.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listOrgTransactions(user: AuthUser, status?: string) {
    if (!user.organizationId) throw errors.notFound();
    if (user.role === Role.MEMBER) throw errors.forbidden();
    assertTenantAccess(user, user.organizationId);

    return prisma.transaction.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status: status as TransactionStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Atomically activate organization from a successful registration checkout.
   * Safe for concurrent calls when called after WebhookEvent insert.
   */
  async activateFromCheckoutSession(session: Stripe.Checkout.Session) {
    const pendingId = session.metadata?.pendingRegistrationId;
    const type = session.metadata?.type;

    if (type === 'upgrade' || type === 'downgrade') {
      return this.applyPlanChangeFromSession(session, type);
    }

    if (!pendingId) {
      throw errors.validation('Missing pendingRegistrationId in session metadata');
    }

    const pending = await prisma.pendingRegistration.findUnique({
      where: { id: pendingId },
    });
    if (!pending) {
      // Already consumed — treat as success for idempotency of business effect
      return { alreadyProcessed: true };
    }

    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: pending.planId } });
    const amountCents = session.amount_total ?? plan.priceCents;
    const currency = session.currency ?? plan.currency;
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    const periodEnd = new Date();
    if (plan.interval === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: pending.organizationName,
          billingEmail: pending.adminEmail,
          contactEmail: pending.adminEmail,
          status: OrgStatus.ACTIVE,
          stripeCustomerId: customerId,
        },
      });

      const admin = await tx.user.create({
        data: {
          email: pending.adminEmail,
          name: pending.adminName,
          passwordHash: pending.passwordHash,
          role: Role.ORG_ADMIN,
          status: UserStatus.ACTIVE,
          organizationId: org.id,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          organizationId: org.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          stripeSubscriptionId: subscriptionId,
        },
      });

      const payment = await tx.payment.create({
        data: {
          organizationId: org.id,
          amountCents,
          currency,
          status: PaymentStatus.SUCCEEDED,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          description: `Registration — ${plan.name}`,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          organizationId: org.id,
          paymentId: payment.id,
          amountCents,
          currency,
          status: TransactionStatus.SUCCESS,
          type: 'REGISTRATION_PAYMENT',
          description: `Registration payment for ${plan.name}`,
          metadata: { sessionId: session.id },
        },
      });

      await tx.pendingRegistration.delete({ where: { id: pending.id } });

      return { org, admin, subscription, payment, transaction };
    });

    await emailService.sendPaymentSucceeded(
      pending.adminEmail,
      pending.organizationName,
      moneyLabel(amountCents, currency),
    );

    return result;
  }

  private async applyPlanChangeFromSession(
    session: Stripe.Checkout.Session,
    action: 'upgrade' | 'downgrade',
  ) {
    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;
    const previousSubscriptionId = session.metadata?.previousSubscriptionId;
    if (!organizationId || !planId) {
      throw errors.validation('Missing plan change metadata');
    }

    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });
    const amountCents = session.amount_total ?? plan.priceCents;
    const currency = session.currency ?? plan.currency;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    const periodEnd = new Date();
    if (plan.interval === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (previousSubscriptionId) {
        await tx.subscription.update({
          where: { id: previousSubscriptionId },
          data: { status: SubscriptionStatus.CANCELLED },
        });
      }

      const subscription = await tx.subscription.create({
        data: {
          organizationId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          stripeSubscriptionId: subscriptionId,
        },
      });

      const existingPayment = await tx.payment.findUnique({
        where: { stripeCheckoutSessionId: session.id },
      });

      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amountCents,
              currency,
              status: PaymentStatus.SUCCEEDED,
              stripePaymentIntentId: paymentIntentId,
              description: `${action} — ${plan.name}`,
            },
          })
        : await tx.payment.create({
            data: {
              organizationId,
              amountCents,
              currency,
              status: PaymentStatus.SUCCEEDED,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntentId,
              description: `${action} — ${plan.name}`,
            },
          });

      const existingTx = await tx.transaction.findFirst({
        where: { paymentId: payment.id, status: TransactionStatus.PENDING },
      });

      const transaction = existingTx
        ? await tx.transaction.update({
            where: { id: existingTx.id },
            data: {
              amountCents,
              currency,
              status: TransactionStatus.SUCCESS,
              type: action === 'upgrade' ? 'PLAN_UPGRADE' : 'PLAN_DOWNGRADE',
              description: `Subscription ${action} to ${plan.name}`,
            },
          })
        : await tx.transaction.create({
            data: {
              organizationId,
              paymentId: payment.id,
              amountCents,
              currency,
              status: TransactionStatus.SUCCESS,
              type: action === 'upgrade' ? 'PLAN_UPGRADE' : 'PLAN_DOWNGRADE',
              description: `Subscription ${action} to ${plan.name}`,
            },
          });

      return { subscription, payment, transaction };
    });

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const notifyEmail =
      org.billingEmail ||
      (await prisma.user.findFirst({
        where: { organizationId, role: Role.ORG_ADMIN },
      }))?.email;

    if (notifyEmail) {
      await emailService.sendSubscriptionChanged(
        notifyEmail,
        org.name,
        action === 'upgrade' ? 'upgraded' : 'downgraded',
        plan.name,
      );
      await emailService.sendPaymentSucceeded(
        notifyEmail,
        org.name,
        moneyLabel(amountCents, currency),
      );
    }

    return result;
  }

  async markCheckoutFailed(session: Stripe.Checkout.Session) {
    const pendingId = session.metadata?.pendingRegistrationId;
    const organizationId = session.metadata?.organizationId;
    const email =
      session.customer_email ||
      (typeof session.customer_details?.email === 'string'
        ? session.customer_details.email
        : undefined);

    // Roll back any PENDING payment/tx rows tied to this checkout session.
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        stripeCheckoutSessionId: session.id,
        status: PaymentStatus.PENDING,
      },
    });
    if (pendingPayment) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: pendingPayment.id },
          data: { status: PaymentStatus.FAILED },
        }),
        prisma.transaction.updateMany({
          where: { paymentId: pendingPayment.id, status: TransactionStatus.PENDING },
          data: { status: TransactionStatus.ROLLED_BACK },
        }),
      ]);
    }

    if (pendingId) {
      const pending = await prisma.pendingRegistration.findUnique({
        where: { id: pendingId },
      });
      if (pending) {
        await emailService.sendPaymentFailed(pending.adminEmail, pending.organizationName);
      }
      return;
    }

    if (organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (org) {
        if (!pendingPayment) {
          await prisma.payment.create({
            data: {
              organizationId,
              amountCents: session.amount_total ?? 0,
              currency: session.currency ?? 'usd',
              status: PaymentStatus.FAILED,
              stripeCheckoutSessionId: session.id,
              description: 'Failed checkout',
            },
          });
          await prisma.transaction.create({
            data: {
              organizationId,
              amountCents: session.amount_total ?? 0,
              currency: session.currency ?? 'usd',
              status: TransactionStatus.FAILED,
              type: 'PAYMENT_FAILED',
              description: 'Checkout payment failed',
            },
          });
        }
        if (org.billingEmail || email) {
          await emailService.sendPaymentFailed(org.billingEmail || email!, org.name);
        }
      }
    }
  }

  /**
   * Recurring invoice payment (renewal). Skips subscription_create when the
   * initial checkout.session.completed path already recorded the payment.
   */
  async handleInvoicePaid(invoice: Stripe.Invoice) {
    const inv = invoice as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
      billing_reason?: string | null;
      payment_intent?: string | { id: string } | null;
    };
    const subscriptionRef = inv.subscription;
    const stripeSubscriptionId =
      typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;
    if (!stripeSubscriptionId) return;

    // Initial subscription invoices are activated via checkout.session.completed.
    if (inv.billing_reason === 'subscription_create') return;

    const paymentIntentId =
      typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id;

    if (paymentIntentId) {
      const existing = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });
      if (existing) return;
    }

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
      include: { organization: true, plan: true },
    });
    if (!subscription) return;

    const amountCents = invoice.amount_paid ?? invoice.amount_due ?? 0;
    const currency = invoice.currency ?? subscription.plan.currency;
    const periodStart = invoice.lines?.data?.[0]?.period?.start
      ? new Date(invoice.lines.data[0].period.start * 1000)
      : new Date();
    const periodEnd = invoice.lines?.data?.[0]?.period?.end
      ? new Date(invoice.lines.data[0].period.end * 1000)
      : subscription.currentPeriodEnd;

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd ?? undefined,
        },
      });

      const payment = await tx.payment.create({
        data: {
          organizationId: subscription.organizationId,
          amountCents,
          currency,
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntentId,
          description: `Renewal — ${subscription.plan.name}`,
        },
      });

      await tx.transaction.create({
        data: {
          organizationId: subscription.organizationId,
          paymentId: payment.id,
          amountCents,
          currency,
          status: TransactionStatus.SUCCESS,
          type: 'SUBSCRIPTION_RENEWAL',
          description: `Subscription renewal for ${subscription.plan.name}`,
          metadata: { invoiceId: invoice.id },
        },
      });
    });

    const notifyEmail =
      subscription.organization.billingEmail ||
      (await prisma.user.findFirst({
        where: { organizationId: subscription.organizationId, role: Role.ORG_ADMIN },
      }))?.email;

    if (notifyEmail) {
      await emailService.sendPaymentSucceeded(
        notifyEmail,
        subscription.organization.name,
        moneyLabel(amountCents, currency),
      );
    }
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const inv = invoice as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
    };
    const subscriptionRef = inv.subscription;
    const stripeSubscriptionId =
      typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;
    if (!stripeSubscriptionId) return;

    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
      include: { organization: true, plan: true },
    });
    if (!subscription) return;

    const amountCents = invoice.amount_due ?? 0;
    const currency = invoice.currency ?? subscription.plan.currency;

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.FAILED },
      });

      const payment = await tx.payment.create({
        data: {
          organizationId: subscription.organizationId,
          amountCents,
          currency,
          status: PaymentStatus.FAILED,
          description: `Renewal failed — ${subscription.plan.name}`,
        },
      });

      await tx.transaction.create({
        data: {
          organizationId: subscription.organizationId,
          paymentId: payment.id,
          amountCents,
          currency,
          status: TransactionStatus.FAILED,
          type: 'SUBSCRIPTION_RENEWAL_FAILED',
          description: `Subscription renewal failed for ${subscription.plan.name}`,
          metadata: { invoiceId: invoice.id },
        },
      });
    });

    const notifyEmail =
      subscription.organization.billingEmail ||
      (await prisma.user.findFirst({
        where: { organizationId: subscription.organizationId, role: Role.ORG_ADMIN },
      }))?.email;

    if (notifyEmail) {
      await emailService.sendPaymentFailed(notifyEmail, subscription.organization.name);
    }
  }

  async handleStripeSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    const local = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!local) return;

    const status = mapStripeSubscriptionStatus(stripeSub.status);
    const periodStart = (stripeSub as Stripe.Subscription & { current_period_start?: number })
      .current_period_start;
    const periodEnd = (stripeSub as Stripe.Subscription & { current_period_end?: number })
      .current_period_end;

    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        status,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
        ...(periodStart ? { currentPeriodStart: new Date(periodStart * 1000) } : {}),
        ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
      },
    });
  }

  async handleStripeSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const local = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!local) return;

    await prisma.subscription.update({
      where: { id: local.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        cancelAtPeriodEnd: false,
      },
    });
  }

  async handleChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!payment || payment.status === PaymentStatus.REFUNDED) return;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      }),
      prisma.transaction.updateMany({
        where: { paymentId: payment.id },
        data: { status: TransactionStatus.REFUNDED },
      }),
    ]);
  }
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.FAILED;
    case 'canceled':
      return SubscriptionStatus.CANCELLED;
    case 'paused':
      return SubscriptionStatus.PENDING;
    default:
      return SubscriptionStatus.PENDING;
  }
}

export const paymentService = new PaymentService();

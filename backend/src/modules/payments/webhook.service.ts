import { Request } from 'express';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { stripe } from '../../integrations/stripe/stripe.client';
import { errors } from '../../utils/errors';
import { paymentService } from '../payments/payment.service';

export class WebhookService {
  constructEvent(req: Request): Stripe.Event {
    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      throw errors.validation('Missing Stripe signature');
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw errors.internal('Raw body missing for webhook verification');
    }

    try {
      return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw errors.unauthorized('Invalid Stripe webhook signature');
    }
  }

  /**
   * Idempotent webhook handling:
   * 1) If event id already recorded → duplicate (safe no-op)
   * 2) Run business effects first
   * 3) Record event id only after success
   *
   * This way a failed activation does not block Stripe retries.
   * Concurrent deliveries: unique stripeEventId + business-level idempotency.
   */
  async handleEvent(event: Stripe.Event) {
    const existing = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      return { duplicate: true, code: 'DUPLICATE_WEBHOOK' as const };
    }

    await this.dispatch(event);

    try {
      await prisma.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
        },
      });
    } catch {
      // Another worker recorded the same event after both passed the pre-check.
      return { duplicate: true, code: 'DUPLICATE_WEBHOOK' as const };
    }

    return { duplicate: false };
  }

  private async dispatch(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid' || session.status === 'complete') {
          await paymentService.activateFromCheckoutSession(session);
        }
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.markCheckoutFailed(session);
        break;
      }
      case 'invoice.paid': {
        await paymentService.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      }
      case 'invoice.payment_failed': {
        await paymentService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      case 'customer.subscription.updated': {
        await paymentService.handleStripeSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case 'customer.subscription.deleted': {
        await paymentService.handleStripeSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case 'charge.refunded': {
        await paymentService.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      }
      default:
        break;
    }
  }
}

export const webhookService = new WebhookService();

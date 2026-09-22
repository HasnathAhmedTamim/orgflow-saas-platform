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

  async handleEvent(event: Stripe.Event) {
    const existing = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (existing) {
      return { duplicate: true, code: 'DUPLICATE_WEBHOOK' as const };
    }

    try {
      await prisma.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
        },
      });
    } catch {
      // Unique constraint race — another worker processed it
      return { duplicate: true, code: 'DUPLICATE_WEBHOOK' as const };
    }

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
      default:
        break;
    }

    return { duplicate: false };
  }
}

export const webhookService = new WebhookService();

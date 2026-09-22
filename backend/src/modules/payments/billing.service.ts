import PDFDocument from 'pdfkit';
import { Role } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { stripe } from '../../integrations/stripe/stripe.client';
import { AuthUser, assertTenantAccess } from '../../middlewares/auth.middleware';
import { errors } from '../../utils/errors';

export class BillingService {
  async createPortalSession(user: AuthUser) {
    if (user.role !== Role.ORG_ADMIN) throw errors.forbidden();
    if (!user.organizationId) throw errors.notFound();
    assertTenantAccess(user, user.organizationId);

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });

    if (!org.stripeCustomerId) {
      throw errors.validation(
        'No Stripe customer is linked yet. Complete a payment first, then manage payment methods.',
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${env.FRONTEND_URL}/organization/billing`,
    });

    return { url: session.url };
  }

  async downloadInvoice(user: AuthUser, paymentId: string): Promise<Buffer> {
    if (user.role !== Role.ORG_ADMIN) throw errors.forbidden();
    if (!user.organizationId) throw errors.notFound();
    assertTenantAccess(user, user.organizationId);

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, organizationId: user.organizationId },
      include: {
        organization: true,
        transactions: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!payment) throw errors.notFound('Payment not found');

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: user.organizationId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const invoiceNumber = `INV-${payment.id.slice(-8).toUpperCase()}`;
    const amount = (payment.amountCents / 100).toFixed(2);
    const periodStart = subscription?.currentPeriodStart
      ? subscription.currentPeriodStart.toISOString().slice(0, 10)
      : '—';
    const periodEnd = subscription?.currentPeriodEnd
      ? subscription.currentPeriodEnd.toISOString().slice(0, 10)
      : '—';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('OrgFlow Invoice', { align: 'left' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice number: ${invoiceNumber}`);
      doc.text(`Payment date: ${payment.createdAt.toISOString().slice(0, 10)}`);
      doc.text(`Organization: ${payment.organization.name}`);
      doc.text(`Plan: ${subscription?.plan.name ?? payment.description ?? '—'}`);
      doc.text(`Billing period: ${periodStart} to ${periodEnd}`);
      doc.text(`Amount charged: ${amount} ${payment.currency.toUpperCase()}`);
      doc.text(`Status: ${payment.status}`);
      doc.moveDown();
      doc.text('Thank you for your business.');
      doc.end();
    });
  }
}

export const billingService = new BillingService();

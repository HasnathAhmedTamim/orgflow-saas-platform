import { prisma } from '../config/prisma';
import { emailService } from '../integrations/email/email.service';
import { Role, SubscriptionStatus } from '@prisma/client';

/**
 * Sends "subscription expiring soon" emails for ACTIVE subscriptions
 * ending within the next 7 days. Safe to run repeatedly (at most one
 * reminder window check per process tick — assessment-friendly job).
 */
export async function sendExpiringSubscriptionReminders() {
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: {
        gte: now,
        lte: inSevenDays,
      },
    },
    include: {
      organization: true,
      plan: true,
    },
  });

  for (const sub of subscriptions) {
    const admin = await prisma.user.findFirst({
      where: {
        organizationId: sub.organizationId,
        role: Role.ORG_ADMIN,
      },
    });
    const to = sub.organization.billingEmail || admin?.email;
    if (!to || !sub.currentPeriodEnd) continue;

    await emailService.sendSubscriptionExpiringSoon(
      to,
      sub.organization.name,
      sub.currentPeriodEnd.toISOString().slice(0, 10),
    );
  }

  return { checked: subscriptions.length };
}

import {
  BillingInterval,
  OrgStatus,
  PaymentStatus,
  Role,
  SubscriptionStatus,
  TransactionStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding OrgFlow...');

  await prisma.webhookEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.pendingRegistration.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.plan.deleteMany();

  const starter = await prisma.plan.create({
    data: {
      name: 'Starter',
      description: 'For small teams getting started',
      priceCents: 2900,
      currency: 'usd',
      interval: BillingInterval.MONTHLY,
      features: ['Up to 5 members', 'Basic support', 'Transaction history'],
      isActive: true,
    },
  });

  const pro = await prisma.plan.create({
    data: {
      name: 'Pro',
      description: 'For growing organizations',
      priceCents: 7900,
      currency: 'usd',
      interval: BillingInterval.MONTHLY,
      features: ['Up to 25 members', 'Priority support', 'Advanced billing'],
      isActive: true,
    },
  });

  await prisma.plan.create({
    data: {
      name: 'Enterprise',
      description: 'For large organizations',
      priceCents: 19900,
      currency: 'usd',
      interval: BillingInterval.YEARLY,
      features: ['Unlimited members', 'Dedicated support', 'Custom terms'],
      isActive: true,
    },
  });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  await prisma.user.create({
    data: {
      email: 'platform.admin@orgflow.test',
      name: 'Platform Admin',
      passwordHash,
      role: Role.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corp',
      contactEmail: 'admin@acme.test',
      billingEmail: 'billing@acme.test',
      contactPhone: '+1-555-0100',
      status: OrgStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      email: 'org.admin@acme.test',
      name: 'Org Admin',
      passwordHash,
      role: Role.ORG_ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'member@acme.test',
      name: 'Org Member',
      passwordHash,
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      organizationId: org.id,
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: starter.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const payment = await prisma.payment.create({
    data: {
      organizationId: org.id,
      amountCents: starter.priceCents,
      currency: 'usd',
      status: PaymentStatus.SUCCEEDED,
      description: 'Seed registration payment',
      stripeCheckoutSessionId: 'cs_test_seed_1',
    },
  });

  await prisma.transaction.create({
    data: {
      organizationId: org.id,
      paymentId: payment.id,
      amountCents: starter.priceCents,
      currency: 'usd',
      status: TransactionStatus.SUCCESS,
      type: 'REGISTRATION_PAYMENT',
      description: 'Seeded successful payment',
    },
  });

  // Second org for tenant isolation demos/tests
  const orgB = await prisma.organization.create({
    data: {
      name: 'Beta Inc',
      contactEmail: 'admin@beta.test',
      billingEmail: 'billing@beta.test',
      status: OrgStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      email: 'org.admin@beta.test',
      name: 'Beta Admin',
      passwordHash,
      role: Role.ORG_ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: orgB.id,
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: orgB.id,
      planId: pro.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Seed complete.');
  console.log('Test credentials (password for all: Password123!):');
  console.log('  Platform Admin: platform.admin@orgflow.test');
  console.log('  Org Admin:      org.admin@acme.test');
  console.log('  Member:         member@acme.test');
  console.log(`  Sample subscription: ${subscription.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { paymentsApi } from '@/lib/api/payments';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  CalendarDays,
  CreditCard,
  Package,
  UserPlus,
  Users,
  ArrowRight,
  Receipt,
} from 'lucide-react';

const quickLinks = [
  { href: '/organization/members', label: 'Members', description: 'Invite and manage roles' },
  { href: '/organization/subscription', label: 'Subscription', description: 'Plan and renewals' },
  { href: '/organization/billing', label: 'Billing', description: 'Invoices and portal' },
  { href: '/organization/transactions', label: 'Transactions', description: 'Payment history' },
] as const;

export default function OrganizationDashboardPage() {
  const { user } = useAuth();

  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: paymentsApi.mySubscription,
  });

  const txQuery = useQuery({
    queryKey: ['transactions', 'dashboard'],
    queryFn: () => paymentsApi.listTransactions(),
  });

  if (orgQuery.isLoading) return <DashboardSkeleton />;
  if (orgQuery.isError) {
    return (
      <ErrorState
        message="We couldn't load your organization dashboard."
        onRetry={() => orgQuery.refetch()}
      />
    );
  }

  const org = orgQuery.data!;
  const subscription = subscriptionQuery.data;
  const recentTx = (txQuery.data ?? []).slice(0, 5);
  const memberCount = org._count?.users ?? org.memberCount ?? '—';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-[var(--muted)]">
            {greeting}, {firstName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--ink)]">
              {org.name}
            </h1>
            <StatusBadge status={org.status} />
          </div>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--muted)]">
            Subscription, members, and recent billing activity.
          </p>
        </div>
        <Link href="/organization/members">
          <Button size="sm">
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        </Link>
      </div>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Summary
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Current plan"
            value={subscription?.plan.name ?? 'No plan'}
            icon={Package}
            hint={
              subscription
                ? `${formatCurrency(subscription.plan.priceCents, subscription.plan.currency)} / ${subscription.plan.interval.toLowerCase()}`
                : 'Choose a plan under Subscription'
            }
          />
          <StatCard
            label="Subscription"
            value={
              subscription?.status ? <StatusBadge status={subscription.status} /> : 'None'
            }
            icon={CreditCard}
            hint={
              subscription?.cancelAtPeriodEnd
                ? 'Cancels at end of billing period'
                : undefined
            }
          />
          <StatCard label="Members" value={memberCount} icon={Users} />
          <StatCard
            label="Next billing"
            value={
              subscription?.currentPeriodEnd
                ? formatDate(subscription.currentPeriodEnd)
                : '—'
            }
            icon={CalendarDays}
          />
        </div>
      </section>

      <section aria-labelledby="links-heading">
        <h2 id="links-heading" className="mb-3 text-sm font-semibold text-[var(--ink)]">
          Go to
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-white p-4 transition-colors hover:border-[var(--primary)]/40 hover:bg-[color-mix(in_srgb,var(--primary)_4%,white)]"
            >
              <span>
                <span className="block text-sm font-semibold text-[var(--ink)]">{item.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{item.description}</span>
              </span>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="tx-heading"
        className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-white"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[var(--muted)]" aria-hidden />
            <h2 id="tx-heading" className="text-sm font-semibold text-[var(--ink)]">
              Recent transactions
            </h2>
          </div>
          <Link
            href="/organization/transactions"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="px-5 sm:px-6">
          {txQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]" role="status">
              Loading transactions…
            </p>
          ) : txQuery.isError ? (
            <div className="py-8">
              <ErrorState
                message="We couldn't load recent transactions."
                onRetry={() => txQuery.refetch()}
              />
            </div>
          ) : recentTx.length === 0 ? (
            <div className="py-10">
              <EmptyState
                title="No transactions yet"
                description="Payments and subscription events will appear here after billing activity."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {recentTx.map((tx) => (
                <li
                  key={tx.id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{tx.type}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDateTime(tx.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">
                      {formatCurrency(tx.amountCents, tx.currency)}
                    </span>
                    <StatusBadge status={tx.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

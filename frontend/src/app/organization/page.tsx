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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';

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
    <div className="space-y-6 sm:space-y-8">
      <section
        aria-labelledby="welcome-heading"
        className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">
              {greeting}, {firstName}
            </p>
            <h2
              id="welcome-heading"
              className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900"
            >
              {org.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Overview of your organization subscription, members, and recent billing activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={org.status} />
            <Link href="/organization/members">
              <Button>
                <UserPlus className="h-4 w-4" />
                Invite member
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            label="Subscription status"
            value={
              subscription?.status ? (
                <StatusBadge status={subscription.status} />
              ) : (
                'None'
              )
            }
            icon={CreditCard}
            hint={
              subscription?.cancelAtPeriodEnd
                ? 'Cancels at end of billing period'
                : undefined
            }
          />
          <StatCard label="Members" value={memberCount} icon={Users} hint="Active organization seats" />
          <StatCard
            label="Next billing"
            value={
              subscription?.currentPeriodEnd
                ? formatDate(subscription.currentPeriodEnd)
                : '—'
            }
            icon={CalendarDays}
            hint={
              subscription?.currentPeriodEnd
                ? 'Current period end date'
                : 'Available once a subscription is active'
            }
          />
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading" className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle id="quick-actions-heading">Quick actions</CardTitle>
            <CardDescription>Common organization tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/organization/members" className="block">
              <Button variant="outline" className="w-full justify-between">
                Invite / manage members
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Button>
            </Link>
            <Link href="/organization/subscription" className="block">
              <Button variant="outline" className="w-full justify-between">
                Manage subscription
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Button>
            </Link>
            <Link href="/organization/billing" className="block">
              <Button variant="outline" className="w-full justify-between">
                View billing
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Button>
            </Link>
            <Link href="/organization/transactions" className="block">
              <Button variant="outline" className="w-full justify-between">
                View transactions
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Latest subscription and payment events</CardDescription>
            </div>
            <Link
              href="/organization/transactions"
              className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {txQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-slate-500" role="status">
                Loading transactions…
              </p>
            ) : txQuery.isError ? (
              <ErrorState
                className="py-8"
                message="We couldn't load recent transactions."
                onRetry={() => txQuery.refetch()}
              />
            ) : recentTx.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                description="Payments and subscription events will appear here after billing activity."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentTx.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{tx.type}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(tx.amountCents, tx.currency)}
                      </span>
                      <StatusBadge status={tx.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, CreditCard, Users, AlertTriangle, Receipt, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function PlatformDashboardPage() {
  const { user } = useAuth();
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });

  if (statsQuery.isLoading) return <DashboardSkeleton />;
  if (statsQuery.isError) {
    return <ErrorState onRetry={() => statsQuery.refetch()} />;
  }

  const stats = statsQuery.data!;
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">
            {greeting}, {firstName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Platform overview
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--muted)]">
            Organizations, subscriptions, and payment health across the product.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/platform/transactions">
            <Button variant="outline" size="sm">
              Transactions
            </Button>
          </Link>
          <Link href="/platform/organizations">
            <Button size="sm">
              Organizations
              <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </Link>
        </div>
      </div>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Organizations" value={stats.totalOrganizations} icon={Building2} />
          <StatCard
            label="Active organizations"
            value={stats.activeOrganizations}
            icon={Building2}
          />
          <StatCard label="Users" value={stats.totalUsers} icon={Users} />
          <StatCard
            label="Active subscriptions"
            value={stats.activeSubscriptions}
            icon={CreditCard}
          />
          <StatCard
            label="Total revenue"
            value={formatCurrency(stats.totalRevenueCents)}
            icon={Receipt}
          />
          <StatCard
            label="Failed payments"
            value={stats.failedPaymentCount}
            icon={AlertTriangle}
            hint={stats.failedPaymentCount > 0 ? 'Review failed checkouts' : 'All clear'}
          />
        </div>
      </section>

      <section
        aria-labelledby="signups-heading"
        className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-white"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 id="signups-heading" className="text-sm font-semibold text-[var(--ink)]">
            Recent signups
          </h2>
          <Link
            href="/platform/organizations"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            See all
          </Link>
        </div>
        <div className="px-5 sm:px-6">
          {stats.recentSignups.length === 0 ? (
            <div className="py-10">
              <EmptyState
                title="No recent signups"
                description="New organizations will appear here after registration."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {stats.recentSignups.map((org) => (
                <li
                  key={org.id}
                  className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/platform/organizations/${org.id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--primary)]"
                    >
                      {org.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDate(org.createdAt)}</p>
                  </div>
                  <StatusBadge status={org.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

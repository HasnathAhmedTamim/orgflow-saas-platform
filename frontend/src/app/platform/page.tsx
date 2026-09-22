'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, CreditCard, Users, AlertTriangle, Receipt } from 'lucide-react';

export default function PlatformDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });

  if (statsQuery.isLoading) return <DashboardSkeleton />;
  if (statsQuery.isError) {
    return <ErrorState onRetry={() => statsQuery.refetch()} />;
  }

  const stats = statsQuery.data!;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform dashboard"
        description={`${greeting} — overview of organizations, subscriptions, and revenue`}
        actions={
          <Link href="/platform/organizations">
            <Button variant="outline" size="sm">
              View organizations
            </Button>
          </Link>
        }
      />

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Organizations" value={stats.totalOrganizations} icon={Building2} />
          <StatCard label="Active organizations" value={stats.activeOrganizations} icon={Building2} />
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
            hint="Needs attention"
          />
        </div>
      </section>

      <section aria-labelledby="signups-heading">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle id="signups-heading">Recent signups</CardTitle>
            <Link href="/platform/organizations" className="text-sm font-medium text-[var(--primary)] hover:underline">
              See all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentSignups.length === 0 ? (
              <EmptyState
                title="No recent signups"
                description="New organizations will appear here after registration."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.recentSignups.map((org) => (
                  <li
                    key={org.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/platform/organizations/${org.id}`}
                        className="font-medium text-slate-900 hover:text-[var(--primary)]"
                      >
                        {org.name}
                      </Link>
                      <p className="text-xs text-slate-500">{formatDate(org.createdAt)}</p>
                    </div>
                    <StatusBadge status={org.status} />
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

'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, CreditCard, Users, AlertTriangle } from 'lucide-react';

export default function PlatformDashboardPage() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });

  if (statsQuery.isLoading) return <LoadingState />;
  if (statsQuery.isError) {
    return <ErrorState onRetry={() => statsQuery.refetch()} />;
  }

  const stats = statsQuery.data!;

  const cards = [
    { label: 'Organizations', value: stats.totalOrganizations, icon: Building2 },
    { label: 'Active orgs', value: stats.activeOrganizations, icon: Building2 },
    { label: 'Users', value: stats.totalUsers, icon: Users },
    { label: 'Active subscriptions', value: stats.activeSubscriptions, icon: CreditCard },
    { label: 'Total revenue', value: formatCurrency(stats.totalRevenueCents), icon: CreditCard },
    { label: 'Failed payments', value: stats.failedPaymentCount, icon: AlertTriangle },
  ];

  return (
    <div>
      <PageHeader title="Platform dashboard" description="Overview of organizations and revenue" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{card.label}</CardTitle>
                <Icon className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent signups</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentSignups.length === 0 ? (
            <p className="text-sm text-slate-500">No recent signups</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {stats.recentSignups.map((org) => (
                <li key={org.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-900">{org.name}</p>
                    <p className="text-xs text-slate-500">{formatDate(org.createdAt)}</p>
                  </div>
                  <StatusBadge status={org.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

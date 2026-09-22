'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { paymentsApi } from '@/lib/api/payments';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/utils';
import { Building2, CreditCard, Users } from 'lucide-react';

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

  if (orgQuery.isLoading) return <LoadingState />;
  if (orgQuery.isError) return <ErrorState onRetry={() => orgQuery.refetch()} />;

  const org = orgQuery.data!;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description={`Managing ${org.name}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Organization</CardTitle>
            <Building2 className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{org.name}</p>
            <div className="mt-2">
              <StatusBadge status={org.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Members</CardTitle>
            <Users className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{org._count?.users ?? org.memberCount ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Subscription</CardTitle>
            <CreditCard className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            {subscriptionQuery.data ? (
              <>
                <p className="text-xl font-bold">{subscriptionQuery.data.plan.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCurrency(subscriptionQuery.data.plan.priceCents, subscriptionQuery.data.plan.currency)}
                  /{subscriptionQuery.data.plan.interval.toLowerCase()}
                </p>
                <div className="mt-2">
                  <StatusBadge status={subscriptionQuery.data.status} />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No active subscription</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

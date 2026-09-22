'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function MemberOrganizationPage() {
  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  if (orgQuery.isLoading) return <LoadingState />;
  if (orgQuery.isError) return <ErrorState onRetry={() => orgQuery.refetch()} />;

  const org = orgQuery.data!;

  return (
    <div>
      <PageHeader title="Organization" description="Read-only view of your organization" />

      <Card>
        <CardHeader>
          <CardTitle>{org.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <StatusBadge status={org.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Plan</span>
            <span>{org.planName ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Subscription</span>
            {org.subscriptionStatus ? (
              <StatusBadge status={org.subscriptionStatus} />
            ) : (
              <span>—</span>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Members</span>
            <span>{org._count?.users ?? org.memberCount ?? '—'}</span>
          </div>
          {org.createdAt && (
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span>{formatDate(org.createdAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

export default function MemberOrganizationPage() {
  const { user } = useAuth();
  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  if (orgQuery.isLoading) return <LoadingState />;
  if (orgQuery.isError) return <ErrorState onRetry={() => orgQuery.refetch()} />;

  const org = orgQuery.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization"
        description="Read-only view — billing and subscriptions are managed by your organization admin"
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{org.name}</CardTitle>
          <CardDescription>Your workplace in OrgFlow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <span className="text-slate-500">Your role</span>
            <span className="font-medium text-slate-900">
              {user?.role?.replace(/_/g, ' ') ?? 'Member'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <span className="text-slate-500">Organization status</span>
            <StatusBadge status={org.status} />
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <span className="text-slate-500">Plan</span>
            <span className="font-medium text-slate-900">{org.planName ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Subscription</span>
            <span className="text-slate-600">Managed by organization admin</span>
          </div>
          {org.createdAt ? (
            <p className="pt-2 text-xs text-slate-400">
              Organization since {formatDate(org.createdAt)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

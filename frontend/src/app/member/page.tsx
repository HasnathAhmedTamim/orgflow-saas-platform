'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Building2, User, Shield } from 'lucide-react';

export default function MemberDashboardPage() {
  const { user } = useAuth();

  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  if (orgQuery.isLoading) return <DashboardSkeleton />;
  if (orgQuery.isError) return <ErrorState onRetry={() => orgQuery.refetch()} />;

  const org = orgQuery.data!;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Your member workspace — billing and subscriptions are managed by your organization admin."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Organization" value={org.name} icon={Building2} />
        <StatCard
          label="Your role"
          value={user?.role?.replace(/_/g, ' ') ?? 'Member'}
          icon={Shield}
        />
        <StatCard
          label="Account status"
          value={user?.status ? <StatusBadge status={user.status} /> : '—'}
          icon={User}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-slate-600">
            Subscription and billing are managed by your organization admin. You can view
            organization details and update your personal profile.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/member/organization">
              <Button variant="outline">View organization</Button>
            </Link>
            <Link href="/member/profile">
              <Button variant="outline">Edit profile</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { ErrorState } from '@/components/common/ErrorState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/use-auth';
import { Building2, User, Shield, ArrowRight } from 'lucide-react';

export default function MemberDashboardPage() {
  const { user } = useAuth();

  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  if (orgQuery.isLoading) return <DashboardSkeleton />;
  if (orgQuery.isError) return <ErrorState onRetry={() => orgQuery.refetch()} />;

  const org = orgQuery.data!;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Welcome, {firstName}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-[var(--muted)]">
          Your member workspace. Billing and subscriptions are managed by your organization admin.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/member/organization"
          className="group flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 transition-colors hover:border-[var(--primary)]/40"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Organization</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Name and plan (read-only)</p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--primary)]" />
        </Link>
        <Link
          href="/member/profile"
          className="group flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 transition-colors hover:border-[var(--primary)]/40"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Your profile</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Account details and password</p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted)] group-hover:text-[var(--primary)]" />
        </Link>
      </div>
    </div>
  );
}

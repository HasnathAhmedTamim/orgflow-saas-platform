'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { OrgStatus } from '@/lib/types';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/use-auth';

export default function PlatformOrganizationsPage() {
  const { logout } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrgStatus | ''>('');
  const [page, setPage] = useState(1);

  const orgsQuery = useQuery({
    queryKey: ['admin', 'organizations', search, status, page],
    queryFn: () =>
      adminApi.listOrganizations({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      }),
  });

  const forbidden =
    orgsQuery.error instanceof ApiError && orgsQuery.error.status === 403;

  return (
    <div>
      <PageHeader title="Organizations" description="Search and manage tenant organizations" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search organizations"
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrgStatus | '');
            setPage(1);
          }}
          aria-label="Filter by status"
          className="sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="TRIAL">Trial</option>
          <option value="PENDING">Pending</option>
        </Select>
      </div>

      {orgsQuery.isLoading ? (
        <LoadingState />
      ) : orgsQuery.isError ? (
        <div className="space-y-3">
          <ErrorState
            title={forbidden ? 'Access denied' : 'Something went wrong'}
            message={
              forbidden
                ? 'Your browser session is not Platform Admin (often after logging in as another role in another tab). Sign out, then sign in with admin@orgflow.com.'
                : orgsQuery.error instanceof ApiError
                  ? orgsQuery.error.message
                  : "We couldn't load organizations."
            }
            onRetry={() => orgsQuery.refetch()}
          />
          {forbidden ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <DataTable
              data={orgsQuery.data?.items ?? []}
              getRowKey={(row) => row.id}
              emptyTitle="No organizations found"
              emptyDescription="Try a different search or clear filters."
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  cell: (row) => (
                    <Link
                      href={`/platform/organizations/${row.id}`}
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      <span className="block max-w-[220px] truncate" title={row.name}>
                        {row.name}
                      </span>
                    </Link>
                  ),
                },
                { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
                { key: 'plan', header: 'Plan', cell: (row) => row.planName ?? '—' },
                { key: 'members', header: 'Members', cell: (row) => row.memberCount },
                { key: 'signup', header: 'Signed up', cell: (row) => formatDate(row.signupDate) },
              ]}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {orgsQuery.data?.page} · {orgsQuery.data?.total} total
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(orgsQuery.data?.items.length ?? 0) < 20}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

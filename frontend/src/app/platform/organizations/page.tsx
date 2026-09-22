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
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { OrgStatus } from '@/lib/types';

export default function PlatformOrganizationsPage() {
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

  return (
    <div>
      <PageHeader title="Organizations" description="Search and manage tenant organizations" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrgStatus | '');
            setPage(1);
          }}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="TRIAL">Trial</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {orgsQuery.isLoading ? (
        <LoadingState />
      ) : orgsQuery.isError ? (
        <ErrorState onRetry={() => orgsQuery.refetch()} />
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white">
            <DataTable
              data={orgsQuery.data?.items ?? []}
              getRowKey={(row) => row.id}
              emptyTitle="No organizations found"
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  cell: (row) => (
                    <Link href={`/platform/organizations/${row.id}`} className="font-medium text-teal-700 hover:underline">
                      {row.name}
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

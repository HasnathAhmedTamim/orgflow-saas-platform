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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function typeLabel(type: string) {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function PlatformTransactionsPage() {
  const [page, setPage] = useState(1);
  const [organizationId, setOrganizationId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const orgsQuery = useQuery({
    queryKey: ['admin', 'organizations', 'tx-filter'],
    queryFn: () => adminApi.listOrganizations({ page: 1, limit: 100 }),
  });

  const txQuery = useQuery({
    queryKey: ['admin', 'transactions', page, organizationId, status, from, to],
    queryFn: () =>
      adminApi.listTransactions({
        page,
        limit: 20,
        organizationId: organizationId || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const hasFilters = Boolean(organizationId || status || from || to);

  function clearFilters() {
    setOrganizationId('');
    setStatus('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Platform-wide payment transactions — filter by organization, status, or date"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="tx-org">Organization</Label>
          <Select
            id="tx-org"
            value={organizationId}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by organization"
          >
            <option value="">All organizations</option>
            {(orgsQuery.data?.items ?? []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-status">Status</Label>
          <Select
            id="tx-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="ROLLED_BACK">Rolled back</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-from">From</Label>
          <Input
            id="tx-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            aria-label="From date"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tx-to">To</Label>
          <Input
            id="tx-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            aria-label="To date"
          />
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!hasFilters}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {txQuery.isLoading ? (
        <LoadingState />
      ) : txQuery.isError ? (
        <ErrorState onRetry={() => txQuery.refetch()} />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <DataTable
              data={txQuery.data?.items ?? []}
              getRowKey={(row) => row.id}
              emptyTitle="No transactions"
              emptyDescription="No platform payment activity matches these filters."
              columns={[
                {
                  key: 'org',
                  header: 'Organization',
                  cell: (row) => {
                    const name = row.organization?.name ?? row.organizationId;
                    return (
                      <Link
                        href={`/platform/organizations/${row.organizationId}`}
                        className="block max-w-[180px] truncate font-medium text-[var(--primary)] hover:underline"
                        title={name}
                      >
                        {name}
                      </Link>
                    );
                  },
                },
                {
                  key: 'type',
                  header: 'Type',
                  cell: (row) => (
                    <span className="capitalize text-slate-700">{typeLabel(row.type)}</span>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  cell: (row) => formatCurrency(row.amountCents, row.currency),
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'ref',
                  header: 'Reference',
                  cell: (row) => (
                    <span className="font-mono text-xs text-slate-500" title={row.id}>
                      {row.id.slice(0, 8)}…
                    </span>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  cell: (row) => formatDateTime(row.createdAt),
                },
              ]}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {txQuery.data?.page} · {txQuery.data?.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(txQuery.data?.items.length ?? 0) < 20}
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

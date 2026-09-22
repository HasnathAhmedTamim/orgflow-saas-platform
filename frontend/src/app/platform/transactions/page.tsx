'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function PlatformTransactionsPage() {
  const [page, setPage] = useState(1);
  const [organizationId, setOrganizationId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

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

  return (
    <div>
      <PageHeader title="Transactions" description="Platform-wide payment transactions" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Organization ID"
          value={organizationId}
          onChange={(e) => {
            setOrganizationId(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="ROLLED_BACK">Rolled back</option>
        </select>
        <Input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
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
              emptyDescription="Platform payment activity will appear here."
              columns={[
                {
                  key: 'org',
                  header: 'Organization',
                  cell: (row) => (
                    <span className="block max-w-[180px] truncate font-medium" title={row.organization?.name ?? row.organizationId}>
                      {row.organization?.name ?? row.organizationId}
                    </span>
                  ),
                },
                { key: 'type', header: 'Type', cell: (row) => row.type },
                {
                  key: 'amount',
                  header: 'Amount',
                  cell: (row) => formatCurrency(row.amountCents, row.currency),
                },
                { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'ref',
                  header: 'Reference',
                  cell: (row) => (
                    <span className="font-mono text-xs text-slate-500" title={row.id}>
                      {row.id.slice(0, 8)}…
                    </span>
                  ),
                },
                { key: 'date', header: 'Date', cell: (row) => formatDateTime(row.createdAt) },
              ]}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {txQuery.data?.page} · {txQuery.data?.total} total
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

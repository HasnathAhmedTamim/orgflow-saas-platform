'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { CreditCard, Receipt } from 'lucide-react';

function typeLabel(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function OrganizationTransactionsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const txQuery = useQuery({
    queryKey: ['transactions', status],
    queryFn: () => paymentsApi.listTransactions(status || undefined),
  });

  const filtered = useMemo(() => {
    const rows = txQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.id.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q),
    );
  }, [txQuery.data, search]);

  if (txQuery.isLoading) return <DashboardSkeleton />;
  if (txQuery.isError) {
    return (
      <ErrorState
        message="We couldn't load your transactions."
        onRetry={() => txQuery.refetch()}
      />
    );
  }

  const total = txQuery.data?.length ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500">
              <Receipt className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm">Ledger</span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Transactions
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Organization subscription and payment events from your billing activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/organization/billing">
              <Button variant="outline" size="sm">
                <CreditCard className="h-4 w-4" />
                Billing
              </Button>
            </Link>
            <Link href="/organization/subscription">
              <Button variant="outline" size="sm">
                Subscription
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Transaction history</CardTitle>
            <CardDescription>
              {total} record{total === 1 ? '' : 's'}
              {filtered.length !== total ? ` · showing ${filtered.length}` : ''}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input
              placeholder="Search ID, type, status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search transactions"
              className="sm:w-56"
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
              className="sm:w-44"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="ROLLED_BACK">Rolled back</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          <div className="overflow-x-auto border-t border-slate-100">
            <DataTable
              data={filtered}
              getRowKey={(row) => row.id}
              emptyTitle={total === 0 ? 'No transactions yet' : 'No matching transactions'}
              emptyDescription={
                total === 0
                  ? 'Subscription and payment events will appear here after billing activity.'
                  : 'Try a different search or clear filters.'
              }
              columns={[
                {
                  key: 'id',
                  header: 'Transaction ID',
                  cell: (row) => (
                    <span
                      className="block max-w-[120px] truncate font-mono text-xs text-slate-500"
                      title={row.id}
                    >
                      {row.id.slice(0, 8)}…
                    </span>
                  ),
                },
                {
                  key: 'type',
                  header: 'Type',
                  cell: (row) => (
                    <span className="font-medium text-slate-900">{typeLabel(row.type)}</span>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  cell: (row) => (
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(row.amountCents, row.currency)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'date',
                  header: 'Date',
                  cell: (row) => (
                    <span className="whitespace-nowrap text-slate-600">
                      {formatDateTime(row.createdAt)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

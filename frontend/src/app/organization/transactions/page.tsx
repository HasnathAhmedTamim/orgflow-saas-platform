'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function OrganizationTransactionsPage() {
  const [status, setStatus] = useState('');

  const txQuery = useQuery({
    queryKey: ['transactions', status],
    queryFn: () => paymentsApi.listTransactions(status || undefined),
  });

  return (
    <div>
      <PageHeader title="Transactions" description="Organization transaction ledger" />

      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="ROLLED_BACK">Rolled back</option>
        </select>
      </div>

      {txQuery.isLoading ? (
        <LoadingState />
      ) : txQuery.isError ? (
        <ErrorState onRetry={() => txQuery.refetch()} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <DataTable
            data={txQuery.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No transactions"
            columns={[
              { key: 'type', header: 'Type', cell: (row) => row.type },
              {
                key: 'amount',
                header: 'Amount',
                cell: (row) => formatCurrency(row.amountCents, row.currency),
              },
              { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              { key: 'date', header: 'Date', cell: (row) => formatDateTime(row.createdAt) },
            ]}
          />
        </div>
      )}
    </div>
  );
}

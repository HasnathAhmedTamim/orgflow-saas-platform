'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { organizationsApi } from '@/lib/api/organizations';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function OrganizationBillingPage() {
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.listPayments,
  });

  async function openPortal() {
    setActionError(null);
    setPortalLoading(true);
    try {
      const { url } = await paymentsApi.openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  async function downloadInvoice(paymentId: string) {
    setActionError(null);
    setInvoiceLoadingId(paymentId);
    try {
      await paymentsApi.downloadInvoice(paymentId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not download invoice');
    } finally {
      setInvoiceLoadingId(null);
    }
  }

  if (orgQuery.isLoading || paymentsQuery.isLoading) return <LoadingState />;
  if (paymentsQuery.isError) return <ErrorState onRetry={() => paymentsQuery.refetch()} />;

  const org = orgQuery.data;

  return (
    <div>
      <PageHeader title="Billing" description="Payment methods, history, and invoices" />

      {actionError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-slate-500">Billing email:</span>{' '}
            {org?.billingEmail ?? 'Not set'}
          </p>
          <p>
            <span className="text-slate-500">Stripe customer:</span>{' '}
            {org?.stripeCustomerId ? 'Connected' : 'Not connected'}
          </p>
          <Button onClick={openPortal} disabled={portalLoading || !org?.stripeCustomerId}>
            {portalLoading ? 'Opening…' : 'Manage payment methods'}
          </Button>
          {!org?.stripeCustomerId ? (
            <p className="text-xs text-slate-500">
              Complete a Stripe payment first to manage card details securely in Stripe.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={paymentsQuery.data ?? []}
            getRowKey={(row) => row.id}
            emptyTitle="No payments yet"
            columns={[
              {
                key: 'amount',
                header: 'Amount',
                cell: (row) => formatCurrency(row.amountCents, row.currency),
              },
              { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              { key: 'date', header: 'Date', cell: (row) => formatDateTime(row.createdAt) },
              {
                key: 'invoice',
                header: 'Invoice',
                cell: (row) => (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={invoiceLoadingId === row.id}
                    onClick={() => downloadInvoice(row.id)}
                  >
                    {invoiceLoadingId === row.id ? '…' : 'Download'}
                  </Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

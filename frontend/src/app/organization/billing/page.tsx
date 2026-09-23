'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { organizationsApi } from '@/lib/api/organizations';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable } from '@/components/common/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { CreditCard, ExternalLink, Package } from 'lucide-react';

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
      toast.success('Opening Stripe billing portal…');
      window.location.href = url;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not open billing portal';
      setActionError(message);
      toast.error(message);
    } finally {
      setPortalLoading(false);
    }
  }

  async function downloadInvoice(paymentId: string) {
    setActionError(null);
    setInvoiceLoadingId(paymentId);
    try {
      await paymentsApi.downloadInvoice(paymentId);
      toast.success('Invoice downloaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not download invoice';
      setActionError(message);
      toast.error(message);
    } finally {
      setInvoiceLoadingId(null);
    }
  }

  if (orgQuery.isLoading || paymentsQuery.isLoading) return <DashboardSkeleton />;

  if (orgQuery.isError && paymentsQuery.isError) {
    return (
      <ErrorState
        message="We couldn't load billing information."
        onRetry={() => {
          void orgQuery.refetch();
          void paymentsQuery.refetch();
        }}
      />
    );
  }

  if (paymentsQuery.isError) {
    return (
      <ErrorState
        message="We couldn't load payment history."
        onRetry={() => paymentsQuery.refetch()}
      />
    );
  }

  const org = orgQuery.data;
  const payments = paymentsQuery.data ?? [];
  const stripeConnected = Boolean(org?.stripeCustomerId);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500">
              <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm">Payments</span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Billing</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Manage payment methods in Stripe and download invoices from your payment history.
            </p>
          </div>
          <Link href="/organization/subscription">
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4" />
              Manage subscription
            </Button>
          </Link>
        </div>
      </section>

      {payments.some((p) => p.status === 'PENDING') ? (
        <div
          className="rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">Checkout in progress</p>
          <p className="mt-1 text-amber-900/90">
            One or more payments are still pending. Complete Stripe Checkout or wait for the
            session to expire — abandoned checkouts are rolled back automatically.
          </p>
          <Link
            href="/organization/subscription"
            className="mt-2 inline-block font-medium underline"
          >
            Review subscription
          </Link>
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <CardDescription>Card details are managed securely in Stripe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3 rounded-[var(--radius)] border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Billing email</span>
                <span className="max-w-[160px] truncate text-right font-medium text-slate-900" title={org?.billingEmail ?? undefined}>
                  {org?.billingEmail ?? 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Stripe customer</span>
                {stripeConnected ? (
                  <StatusBadge status="ACTIVE" />
                ) : (
                  <span className="font-medium text-slate-500">Not connected</span>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => void openPortal()}
              disabled={portalLoading || !stripeConnected}
            >
              {portalLoading ? 'Opening…' : 'Manage payment methods'}
              {!portalLoading && stripeConnected ? (
                <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
              ) : null}
            </Button>

            {!stripeConnected ? (
              <p className="text-xs leading-relaxed text-slate-500">
                Complete a Stripe payment first to manage card details securely in the Stripe Customer
                Portal.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500">
                Opens Stripe&apos;s portal to update cards and billing details.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Payment history</CardTitle>
              <CardDescription>
                {payments.length} payment{payments.length === 1 ? '' : 's'} on record
              </CardDescription>
            </div>
            <Link
              href="/organization/transactions"
              className="shrink-0 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              Transactions
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            <div className="overflow-x-auto border-t border-slate-100">
              <DataTable
                data={payments}
                getRowKey={(row) => row.id}
                emptyTitle="No payments yet"
                emptyDescription="Successful charges and invoices will appear here after checkout."
                columns={[
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
                  {
                    key: 'ref',
                    header: 'Reference',
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
                    key: 'invoice',
                    header: 'Invoice',
                    cell: (row) => (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={invoiceLoadingId === row.id}
                        onClick={() => void downloadInvoice(row.id)}
                        aria-label={`Download invoice for payment ${row.id.slice(0, 8)}`}
                      >
                        {invoiceLoadingId === row.id ? 'Downloading…' : 'Download'}
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

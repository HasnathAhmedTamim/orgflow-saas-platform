'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { plansApi } from '@/lib/api/plans';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Check, CreditCard, Package } from 'lucide-react';

export default function OrganizationSubscriptionPage() {
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: paymentsApi.mySubscription,
  });

  const plansQuery = useQuery({
    queryKey: ['plans', 'public'],
    queryFn: plansApi.listPublic,
  });

  const upgradeMutation = useMutation({
    mutationFn: paymentsApi.upgrade,
    onSuccess: (data) => {
      toast.success('Redirecting to Stripe checkout…');
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Upgrade failed');
      setPendingPlanId(null);
    },
  });

  const downgradeMutation = useMutation({
    mutationFn: paymentsApi.downgrade,
    onSuccess: (data) => {
      toast.success('Redirecting to Stripe checkout…');
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Downgrade failed');
      setPendingPlanId(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: paymentsApi.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['organization', 'me'] });
      setShowCancel(false);
      toast.success('Subscription cancelled');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Cancel failed');
    },
  });

  if (subscriptionQuery.isLoading || plansQuery.isLoading) return <DashboardSkeleton />;
  if (subscriptionQuery.isError) {
    return (
      <ErrorState
        message="We couldn't load your subscription."
        onRetry={() => subscriptionQuery.refetch()}
      />
    );
  }

  const subscription = subscriptionQuery.data;
  const plans = plansQuery.data ?? [];
  const currentPlan = subscription?.plan;
  const busy = upgradeMutation.isPending || downgradeMutation.isPending;

  function changePlan(planId: string, direction: 'upgrade' | 'downgrade' | 'select') {
    setPendingPlanId(planId);
    if (direction === 'downgrade') {
      downgradeMutation.mutate(planId);
    } else {
      upgradeMutation.mutate(planId);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500">
              <Package className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm">Billing plan</span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Subscription
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Review your current plan, change tiers through Stripe Checkout, or cancel at period end.
            </p>
          </div>
          <Link href="/organization/billing">
            <Button variant="outline" size="sm">
              <CreditCard className="h-4 w-4" />
              View billing
            </Button>
          </Link>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Your active subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription && currentPlan ? (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{currentPlan.name}</p>
                  <p className="mt-1 text-lg text-slate-700">
                    {formatCurrency(currentPlan.priceCents, currentPlan.currency)}
                    <span className="text-sm font-normal text-slate-500">
                      {' '}
                      / {currentPlan.interval.toLowerCase()}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={subscription.status} />
                  {subscription.cancelAtPeriodEnd ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Cancels at period end
                    </span>
                  ) : null}
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {subscription.currentPeriodEnd ? (
                    <div>
                      <dt className="text-slate-500">Next billing</dt>
                      <dd className="font-medium text-slate-900">
                        {formatDate(subscription.currentPeriodEnd)}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-slate-500">Interval</dt>
                    <dd className="font-medium capitalize text-slate-900">
                      {currentPlan.interval.toLowerCase()}
                    </dd>
                  </div>
                </dl>
              </div>
              {!subscription.cancelAtPeriodEnd ? (
                <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)}>
                  Cancel subscription
                </Button>
              ) : (
                <p className="max-w-xs text-sm text-slate-500">
                  Access continues until the end of the current billing period.
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              title="No active subscription"
              description="Choose a plan below to activate billing for this organization."
            />
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="available-plans">
        <div className="mb-4">
          <h2 id="available-plans" className="text-lg font-semibold text-slate-900">
            Available plans
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Current plan is marked. Upgrade and downgrade actions are labeled clearly.
          </p>
        </div>

        {plansQuery.isError ? (
          <ErrorState
            message="We couldn't load available plans."
            onRetry={() => plansQuery.refetch()}
          />
        ) : plans.length === 0 ? (
          <EmptyState
            title="No plans available"
            description="Plans will appear here once the platform publishes them."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id;
              const isUpgrade = currentPlan ? plan.priceCents > currentPlan.priceCents : false;
              const isDowngrade = currentPlan ? plan.priceCents < currentPlan.priceCents : false;
              const planBusy = busy && pendingPlanId === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'flex flex-col',
                    isCurrent && 'border-[var(--primary)] ring-1 ring-[var(--primary)]',
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {isCurrent ? <StatusBadge status="ACTIVE" /> : null}
                    </div>
                    <p className="text-2xl font-semibold tracking-tight text-slate-900">
                      {formatCurrency(plan.priceCents, plan.currency)}
                      <span className="text-sm font-normal text-slate-500">
                        /{plan.interval.toLowerCase()}
                      </span>
                    </p>
                    {plan.description ? (
                      <CardDescription>{plan.description}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5">
                    <ul className="flex-1 space-y-2 text-sm text-slate-600">
                      {plan.features.length > 0 ? (
                        plan.features.map((f) => (
                          <li key={f} className="flex gap-2">
                            <Check
                              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]"
                              aria-hidden
                            />
                            <span>{f}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-slate-400">No feature list provided</li>
                      )}
                    </ul>

                    {isCurrent ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Current plan
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full"
                        disabled={busy}
                        onClick={() => changePlan(plan.id, 'upgrade')}
                      >
                        {planBusy ? 'Processing…' : 'Upgrade'}
                      </Button>
                    ) : isDowngrade ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={busy}
                        onClick={() => changePlan(plan.id, 'downgrade')}
                      >
                        {planBusy ? 'Processing…' : 'Downgrade'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={busy}
                        onClick={() => changePlan(plan.id, 'select')}
                      >
                        {planBusy ? 'Processing…' : 'Select plan'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showCancel}
        title="Cancel subscription?"
        description="Your subscription will be cancelled. Access continues until the end of the billing period."
        confirmLabel="Cancel subscription"
        variant="destructive"
        loading={cancelMutation.isPending}
        onCancel={() => setShowCancel(false)}
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}

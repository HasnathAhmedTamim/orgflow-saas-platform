'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import { plansApi } from '@/lib/api/plans';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OrganizationSubscriptionPage() {
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

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
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
  });

  const downgradeMutation = useMutation({
    mutationFn: paymentsApi.downgrade,
    onSuccess: (data) => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: paymentsApi.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', 'me'] });
      setShowCancel(false);
    },
  });

  if (subscriptionQuery.isLoading || plansQuery.isLoading) return <LoadingState />;
  if (subscriptionQuery.isError) return <ErrorState onRetry={() => subscriptionQuery.refetch()} />;

  const subscription = subscriptionQuery.data;
  const plans = plansQuery.data ?? [];
  const currentPlan = subscription?.plan;

  return (
    <div>
      <PageHeader title="Subscription" description="Manage your plan and billing cycle" />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription && currentPlan ? (
            <div className="space-y-2">
              <p className="text-xl font-bold">{currentPlan.name}</p>
              <p className="text-slate-600">
                {formatCurrency(currentPlan.priceCents, currentPlan.currency)}/
                {currentPlan.interval.toLowerCase()}
              </p>
              <StatusBadge status={subscription.status} />
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-slate-500">
                  Current period ends {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
              {subscription.cancelAtPeriodEnd && (
                <p className="text-sm text-amber-700">Cancels at end of billing period</p>
              )}
              <Button variant="destructive" size="sm" onClick={() => setShowCancel(true)}>
                Cancel subscription
              </Button>
            </div>
          ) : (
            <p className="text-slate-500">No active subscription</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id;
              const isUpgrade = currentPlan ? plan.priceCents > currentPlan.priceCents : false;
              const isDowngrade = currentPlan ? plan.priceCents < currentPlan.priceCents : false;

              return (
                <div key={plan.id} className="rounded-lg border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-lg font-bold text-teal-700">
                    {formatCurrency(plan.priceCents, plan.currency)}/{plan.interval.toLowerCase()}
                  </p>
                  {plan.description && <p className="mt-2 text-sm text-slate-500">{plan.description}</p>}
                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    {plan.features.map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {isCurrent ? (
                      <Button variant="secondary" size="sm" disabled>
                        Current plan
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        size="sm"
                        disabled={upgradeMutation.isPending}
                        onClick={() => upgradeMutation.mutate(plan.id)}
                      >
                        Upgrade
                      </Button>
                    ) : isDowngrade ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downgradeMutation.isPending}
                        onClick={() => downgradeMutation.mutate(plan.id)}
                      >
                        Downgrade
                      </Button>
                    ) : (
                      <Button size="sm" disabled>
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { paymentsApi } from '@/lib/api/payments';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowRight, Building2 } from 'lucide-react';

const orgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  contactPhone: z.string().max(40, 'Phone must be 40 characters or fewer').optional(),
  billingEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
});

type OrgForm = z.infer<typeof orgSchema>;

export default function OrganizationProfilePage() {
  const queryClient = useQueryClient();

  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: paymentsApi.mySubscription,
  });

  const orgForm = useForm<OrgForm>({ resolver: zodResolver(orgSchema) });
  const { isDirty } = orgForm.formState;

  useEffect(() => {
    if (orgQuery.data) {
      orgForm.reset({
        name: orgQuery.data.name,
        contactEmail: orgQuery.data.contactEmail ?? '',
        contactPhone: orgQuery.data.contactPhone ?? '',
        billingEmail: orgQuery.data.billingEmail ?? '',
      });
    }
  }, [orgQuery.data, orgForm]);

  const orgMutation = useMutation({
    mutationFn: organizationsApi.updateMe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'me'] });
      toast.success('Organization updated successfully');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update organization');
    },
  });

  if (orgQuery.isLoading) return <DashboardSkeleton />;
  if (orgQuery.isError) {
    return (
      <ErrorState
        message="We couldn't load your organization details."
        onRetry={() => orgQuery.refetch()}
      />
    );
  }

  const org = orgQuery.data!;
  const subscription = subscriptionQuery.data;
  const memberCount = org._count?.users ?? org.memberCount ?? '—';

  function resetForm() {
    if (!orgQuery.data) return;
    orgForm.reset({
      name: orgQuery.data.name,
      contactEmail: orgQuery.data.contactEmail ?? '',
      contactPhone: orgQuery.data.contactPhone ?? '',
      billingEmail: orgQuery.data.billingEmail ?? '',
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm">Organization profile</span>
            </div>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900">
              {org.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Update contact and billing details for your tenant. Personal account settings are under
              Profile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={org.status} />
            <Link href="/organization/subscription">
              <Button variant="outline" size="sm">
                Manage subscription
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Read-only summary from your workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={org.status} />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="text-slate-500">Current plan</span>
              <span className="truncate font-medium text-slate-900">
                {subscription?.plan.name ?? org.planName ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="text-slate-500">Subscription</span>
              {subscription?.status || org.subscriptionStatus ? (
                <StatusBadge status={subscription?.status ?? org.subscriptionStatus!} />
              ) : (
                <span className="text-slate-500">None</span>
              )}
            </div>
            {subscription ? (
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="text-slate-500">Price</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(subscription.plan.priceCents, subscription.plan.currency)}/
                  {subscription.plan.interval.toLowerCase()}
                </span>
              </div>
            ) : null}
            {subscription?.currentPeriodEnd ? (
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="text-slate-500">Next billing</span>
                <span className="font-medium text-slate-900">
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Members</span>
              <span className="font-medium text-slate-900">{memberCount}</span>
            </div>
            <div className="pt-2">
              <Link href="/organization/members" className="text-sm font-medium text-[var(--primary)] hover:underline">
                Manage members
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
            <CardDescription>Editable fields for this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={orgForm.handleSubmit((v) =>
                orgMutation.mutate({
                  ...v,
                  contactEmail: v.contactEmail || null,
                  billingEmail: v.billingEmail || null,
                  contactPhone: v.contactPhone || null,
                }),
              )}
              className="grid gap-4 sm:grid-cols-2"
              noValidate
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input
                  id="orgName"
                  autoComplete="organization"
                  aria-invalid={!!orgForm.formState.errors.name}
                  aria-describedby={orgForm.formState.errors.name ? 'orgName-error' : undefined}
                  {...orgForm.register('name')}
                />
                {orgForm.formState.errors.name ? (
                  <p id="orgName-error" className="text-xs text-red-600" role="alert">
                    {orgForm.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="contact@company.com"
                  aria-invalid={!!orgForm.formState.errors.contactEmail}
                  {...orgForm.register('contactEmail')}
                />
                {orgForm.formState.errors.contactEmail ? (
                  <p className="text-xs text-red-600" role="alert">
                    {orgForm.formState.errors.contactEmail.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 555 000 0000"
                  aria-invalid={!!orgForm.formState.errors.contactPhone}
                  {...orgForm.register('contactPhone')}
                />
                {orgForm.formState.errors.contactPhone ? (
                  <p className="text-xs text-red-600" role="alert">
                    {orgForm.formState.errors.contactPhone.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="billingEmail">Billing email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="billing@company.com"
                  aria-invalid={!!orgForm.formState.errors.billingEmail}
                  {...orgForm.register('billingEmail')}
                />
                {orgForm.formState.errors.billingEmail ? (
                  <p className="text-xs text-red-600" role="alert">
                    {orgForm.formState.errors.billingEmail.message}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Used for invoices and payment notices when available.</p>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500" aria-live="polite">
                  {isDirty ? 'You have unsaved changes.' : 'No unsaved changes.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isDirty || orgMutation.isPending}
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!isDirty || orgMutation.isPending}>
                    {orgMutation.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

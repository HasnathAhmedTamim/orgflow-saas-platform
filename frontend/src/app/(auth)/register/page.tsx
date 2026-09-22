'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { plansApi } from '@/lib/api/plans';
import { paymentsApi } from '@/lib/api/payments';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const schema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  adminName: z.string().min(2, 'Your name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  planId: z.string().min(1, 'Select a plan'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const plansQuery = useQuery({
    queryKey: ['plans', 'public'],
    queryFn: plansApi.listPublic,
  });

  const registerMutation = useMutation({
    mutationFn: paymentsApi.register,
    onSuccess: (data) => {
      toast.success('Checkout ready — redirecting to Stripe…');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Registration failed');
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedPlanId = watch('planId');

  if (plansQuery.isLoading) return <LoadingState message="Loading plans…" />;
  if (plansQuery.isError) {
    return <ErrorState message="Unable to load plans." onRetry={() => plansQuery.refetch()} />;
  }

  const plans = plansQuery.data ?? [];
  const errorMessage =
    registerMutation.error instanceof ApiError
      ? registerMutation.error.message
      : registerMutation.error
        ? 'Registration failed'
        : null;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-xl">Create your organization</CardTitle>
        <CardDescription>Choose a plan and complete checkout to activate</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((v) => registerMutation.mutate(v))}
          className="space-y-5"
          noValidate
        >
          {errorMessage ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input id="organizationName" {...register('organizationName')} />
            {errors.organizationName ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.organizationName.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin name</Label>
              <Input id="adminName" autoComplete="name" {...register('adminName')} />
              {errors.adminName ? (
                <p className="text-xs text-red-600" role="alert">
                  {errors.adminName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email ? (
                <p className="text-xs text-red-600" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
            {errors.password ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">Select a plan</legend>
            <input type="hidden" {...register('planId')} />
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setValue('planId', plan.id, { shouldValidate: true })}
                    className={cn(
                      'rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                      selected
                        ? 'border-[var(--primary)] bg-[#e8f2f0]'
                        : 'border-[var(--border)] bg-white hover:border-[#b8bec8]',
                    )}
                    aria-pressed={selected}
                  >
                    <p className="font-semibold text-slate-900">{plan.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatCurrency(plan.priceCents, plan.currency)}/
                      {plan.interval.toLowerCase()}
                    </p>
                    {plan.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{plan.description}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {errors.planId ? (
              <p className="text-xs text-red-600" role="alert">
                {errors.planId.message}
              </p>
            ) : null}
          </fieldset>

          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Redirecting to checkout…' : 'Continue to checkout'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

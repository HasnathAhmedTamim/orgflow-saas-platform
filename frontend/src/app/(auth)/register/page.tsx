'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { plansApi } from '@/lib/api/plans';
import { paymentsApi } from '@/lib/api/payments';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';

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
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (plansQuery.isLoading) return <LoadingState message="Loading plans..." />;
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
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>Choose a plan and complete checkout to activate</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => registerMutation.mutate(v))} className="space-y-4">
          {errorMessage && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input id="organizationName" {...register('organizationName')} />
            {errors.organizationName && (
              <p className="text-xs text-red-600">{errors.organizationName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminName">Admin name</Label>
            <Input id="adminName" {...register('adminName')} />
            {errors.adminName && <p className="text-xs text-red-600">{errors.adminName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="planId">Plan</Label>
            <select
              id="planId"
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              {...register('planId')}
              defaultValue=""
            >
              <option value="" disabled>
                Select a plan
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {formatCurrency(plan.priceCents, plan.currency)}/{plan.interval.toLowerCase()}
                </option>
              ))}
            </select>
            {errors.planId && <p className="text-xs text-red-600">{errors.planId.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Redirecting to checkout...' : 'Continue to checkout'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

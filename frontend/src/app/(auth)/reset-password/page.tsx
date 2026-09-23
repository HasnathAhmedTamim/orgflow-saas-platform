'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { SearchParamsBoundary } from '@/components/common/SearchParamsBoundary';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const mutation = useMutation({
    mutationFn: (password: string) => authApi.resetPassword(token, password),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Reset failed'
        : null;

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-sm text-red-600" role="alert">
            Invalid or missing reset token.
          </p>
          <Link href="/forgot-password" className="mt-4 block text-sm font-medium text-[var(--primary)] hover:underline">
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Set new password</CardTitle>
        <CardDescription>Choose a strong password for your account</CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-lg border border-[#c5ddd8] bg-[#e8f2f0] px-3 py-2 text-sm text-[#14534c]"
            >
              {mutation.data.message}
            </div>
            <Link href="/login" className="block text-center text-sm font-medium text-[var(--primary)] hover:underline">
              Sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((v) => mutation.mutate(v.password))}
            className="space-y-4"
            noValidate
          >
            {errorMessage ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput id="password" autoComplete="new-password" {...register('password')} />
              {errors.password ? (
                <p className="text-xs text-red-600" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className="text-xs text-red-600" role="alert">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <SearchParamsBoundary>
      <ResetPasswordPageContent />
    </SearchParamsBoundary>
  );
}

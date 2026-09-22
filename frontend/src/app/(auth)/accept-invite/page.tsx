'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { organizationsApi } from '@/lib/api/organizations';
import { ApiError } from '@/lib/api/client';

const schema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

import { SearchParamsBoundary } from '@/components/common/SearchParamsBoundary';

function AcceptInvitePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      organizationsApi.acceptInvite({ token, name: values.name, password: values.password }),
    onSuccess: () => router.replace('/login'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Failed to accept invite' : null;

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-sm text-red-600">Invalid or missing invitation token.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>Set up your account to join the organization</CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <div className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
              Account created. You can now sign in.
            </div>
            <Link href="/login" className="block text-center text-sm text-teal-700 hover:underline">
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            {errorMessage && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating account...' : 'Join organization'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <SearchParamsBoundary>
      <AcceptInvitePageContent />
    </SearchParamsBoundary>
  );
}

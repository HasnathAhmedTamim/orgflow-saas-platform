'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const mutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: (data) => {
      toast.success(data.message || 'If an account exists, a reset email has been sent.');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not send reset email');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we will send a reset link if an account exists.
        </CardDescription>
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
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((v) => mutation.mutate(v.email))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email ? (
                <p className="text-xs text-red-600" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send reset link'}
            </Button>
            <Link href="/login" className="block text-center text-sm text-slate-500 hover:underline">
              Back to sign in
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

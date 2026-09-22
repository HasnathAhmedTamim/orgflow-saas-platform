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

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const mutation = useMutation({ mutationFn: (email: string) => authApi.forgotPassword(email) });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>We will email you a reset link if an account exists</CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <div className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
              {mutation.data.message}
            </div>
            <Link href="/login" className="block text-center text-sm text-teal-700 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit((v) => mutation.mutate(v.email))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending...' : 'Send reset link'}
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

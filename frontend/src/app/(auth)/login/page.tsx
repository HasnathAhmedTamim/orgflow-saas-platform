'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

import { SearchParamsBoundary } from '@/components/common/SearchParamsBoundary';

function LoginPageContent() {
  const { login, isLoggingIn, loginError } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values);
      if (redirect) {
        window.location.href = redirect;
      }
    } catch {
      // handled via loginError
    }
  };

  const errorMessage =
    loginError instanceof ApiError ? loginError.message : loginError ? 'Login failed' : null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your OrgFlow workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMessage && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="text-teal-700 hover:underline">
            Forgot password?
          </Link>
          <p>
            New organization?{' '}
            <Link href="/register" className="font-medium text-teal-700 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <SearchParamsBoundary>
      <LoginPageContent />
    </SearchParamsBoundary>
  );
}

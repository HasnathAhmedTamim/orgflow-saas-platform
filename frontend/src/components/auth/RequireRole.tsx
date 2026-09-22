'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { getRoleHomePath } from '@/lib/auth-utils';
import type { Role } from '@/lib/types';
import { ApiError } from '@/lib/api/client';

interface RequireRoleProps {
  roles: Role[];
  children: React.ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const router = useRouter();
  const { user, isLoading, error, refetch } = useAuth();

  const allowed = !!user && roles.includes(user.role);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace(getRoleHomePath(user.role));
    }
  }, [user, isLoading, roles, router]);

  if (isLoading) {
    return <LoadingState message="Checking access…" />;
  }

  if (error) {
    const message =
      error instanceof ApiError ? error.message : 'Unable to verify your session.';
    return <ErrorState message={message} onRetry={() => refetch()} />;
  }

  if (!allowed) {
    return <LoadingState message="Redirecting…" />;
  }

  return <>{children}</>;
}

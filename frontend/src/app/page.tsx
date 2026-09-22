'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LoadingState } from '@/components/common/LoadingState';
import { getRoleHomePath } from '@/lib/auth-utils';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(getRoleHomePath(user.role));
    } else {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  return <LoadingState message="Redirecting..." />;
}

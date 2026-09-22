'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi, type LoginInput } from '@/lib/api/auth';
import { getRoleHomePath, userHasRole } from '@/lib/auth-utils';
import type { Role, User } from '@/lib/types';
import { ApiError } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';

type AuthUser = User | null;

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const meQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    // Always re-check the cookie-backed session so multi-tab logins
    // cannot leave a stale role in the shell (e.g. Platform UI + Org cookie → 403).
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
      toast.success(`Welcome back, ${data.user.name}`);
      router.replace(getRoleHomePath(data.user.role));
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      toast.error(message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      toast.info('Signed out successfully');
      router.replace('/login');
    },
    onError: () => {
      toast.error('Could not sign out. Please try again.');
    },
  });

  const redirectToRoleHome = (user?: AuthUser) => {
    const target = user ?? meQuery.data;
    if (target) {
      router.replace(getRoleHomePath(target.role));
    } else {
      router.replace('/login');
    }
  };

  const requireRole = (roles: Role[], redirect = true) => {
    const user = meQuery.data;
    const allowed = userHasRole(user, roles);
    if (!allowed && redirect && !meQuery.isLoading) {
      if (user) {
        router.replace(getRoleHomePath(user.role));
      } else {
        router.replace('/login');
      }
    }
    return { user, allowed, isLoading: meQuery.isLoading, isError: meQuery.isError };
  };

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!meQuery.data,
    error: meQuery.error,
    refetch: meQuery.refetch,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error as ApiError | null,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    redirectToRoleHome,
    requireRole,
  };
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi, type LoginInput } from '@/lib/api/auth';
import { getRoleHomePath, userHasRole } from '@/lib/auth-utils';
import type { Role, User } from '@/lib/types';

type AuthUser = User | null;
import { ApiError } from '@/lib/api/client';

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
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
      router.replace(getRoleHomePath(data.user.role));
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
      router.replace('/login');
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

import type { Role, User } from '@/lib/types';

export function getRoleHomePath(role: Role): string {
  switch (role) {
    case 'PLATFORM_ADMIN':
      return '/platform';
    case 'ORG_ADMIN':
      return '/organization';
    case 'MEMBER':
      return '/member';
    default:
      return '/login';
  }
}

export function userHasRole(user: User | null | undefined, roles: Role[]): boolean {
  return !!user && roles.includes(user.role);
}

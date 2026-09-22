'use client';

import { AppShell } from '@/components/layout/AppShell';
import { RequireRole } from '@/components/auth/RequireRole';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['ORG_ADMIN']}>
      <AppShell variant="organization">{children}</AppShell>
    </RequireRole>
  );
}

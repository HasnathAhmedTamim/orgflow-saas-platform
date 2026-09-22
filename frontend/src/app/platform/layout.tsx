'use client';

import { AppShell } from '@/components/layout/AppShell';
import { RequireRole } from '@/components/auth/RequireRole';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['PLATFORM_ADMIN']}>
      <AppShell variant="platform">{children}</AppShell>
    </RequireRole>
  );
}

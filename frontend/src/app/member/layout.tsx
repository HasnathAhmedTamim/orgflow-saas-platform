'use client';

import { AppShell } from '@/components/layout/AppShell';
import { RequireRole } from '@/components/auth/RequireRole';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={['MEMBER']}>
      <AppShell variant="member">{children}</AppShell>
    </RequireRole>
  );
}

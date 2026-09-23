'use client';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { PageEnter } from '@/components/motion/PageEnter';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <BrandLogo size="sm" />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <PageEnter className="w-full max-w-xl">{children}</PageEnter>
      </main>
    </div>
  );
}

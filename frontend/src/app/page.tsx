'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoadingState } from '@/components/common/LoadingState';
import { getRoleHomePath } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { FadeUp, PageEnter } from '@/components/motion/PageEnter';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getRoleHomePath(user.role));
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <LoadingState message="Loading…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-[var(--border)] bg-white">
          <PageEnter className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <FadeUp>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.12] tracking-tight text-[var(--ink)] sm:text-5xl">
                OrgFlow
              </h1>
            </FadeUp>
            <FadeUp delay={0.06}>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
                Multi-tenant subscriptions — plans, members, and Stripe billing in one workspace.
              </p>
            </FadeUp>
            <FadeUp delay={0.12} className="mt-9 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Create organization</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign in
                </Button>
              </Link>
            </FadeUp>

            <FadeUp
              delay={0.18}
              className="mt-16 grid gap-6 border-t border-[var(--border)] pt-10 sm:grid-cols-3"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Platform admin</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  Tenants, plans, and revenue across the product.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Organization admin</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  Members, subscription changes, and invoices.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Member</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  Profile and org context — no billing surface.
                </p>
              </div>
            </FadeUp>
          </PageEnter>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <p className="text-sm text-[var(--muted)]">
            Already invited?{' '}
            <Link href="/accept-invite" className="font-medium text-[var(--primary)] hover:underline">
              Accept invitation
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

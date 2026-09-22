'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoadingState } from '@/components/common/LoadingState';
import { getRoleHomePath } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-white">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--primary)] text-xs font-bold tracking-wide text-white">
              OF
            </div>
            <span className="text-base font-semibold text-[#14161a]">OrgFlow</span>
          </div>
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
        <section className="border-b border-[var(--border)] bg-[var(--background)]">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                OrgFlow
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.15] tracking-tight text-[#14161a] sm:text-5xl">
                Subscription ops for multi-tenant teams
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--muted)]">
                One workspace for platform admins, organization admins, and members — plans,
                members, billing, and Stripe checkout without the clutter.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register">
                  <Button size="lg">Create organization</Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>

            <aside className="rounded-md border border-[var(--border)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Who it&apos;s for
              </p>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="border-b border-[var(--border)] pb-3">
                  <p className="font-medium text-[#14161a]">Platform admin</p>
                  <p className="mt-1 text-[var(--muted)]">Tenants, plans, and revenue</p>
                </li>
                <li className="border-b border-[var(--border)] pb-3">
                  <p className="font-medium text-[#14161a]">Organization admin</p>
                  <p className="mt-1 text-[var(--muted)]">Members, subscription, billing</p>
                </li>
                <li>
                  <p className="font-medium text-[#14161a]">Member</p>
                  <p className="mt-1 text-[var(--muted)]">Profile and org context only</p>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
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

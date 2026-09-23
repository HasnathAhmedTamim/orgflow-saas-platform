import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { PageEnter } from '@/components/motion/PageEnter';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
          <BrandLogo size="sm" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <PageEnter>
          <p className="font-mono text-xs font-semibold tracking-[0.16em] text-[var(--primary)]">
            404
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Page not found
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
            This URL doesn&apos;t exist or may have moved. Head back home or sign in to your
            workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button size="lg">Go home</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </PageEnter>
      </main>
    </div>
  );
}

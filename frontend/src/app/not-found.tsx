import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--primary)] text-xs font-bold tracking-wide text-white">
              OF
            </div>
            <span className="text-base font-semibold text-[#14161a]">OrgFlow</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#14161a] sm:text-4xl">
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
      </main>
    </div>
  );
}

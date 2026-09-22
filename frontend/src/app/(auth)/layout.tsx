import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--primary)] text-xs font-bold tracking-wide text-white">
              OF
            </div>
            <span className="text-base font-semibold text-[#14161a]">OrgFlow</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">{children}</main>
    </div>
  );
}

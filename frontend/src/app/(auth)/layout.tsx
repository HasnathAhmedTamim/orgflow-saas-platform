import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-lg items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 text-sm font-bold text-white">
              OF
            </div>
            <span className="text-lg font-semibold text-slate-900">OrgFlow</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">{children}</main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { setSidebarOpen, toggleSidebar } from '@/store/ui-slice';
import type { RootState } from '@/store';
import { cn } from '@/lib/utils';

export type AppShellVariant = 'platform' | 'organization' | 'member';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navConfig: Record<AppShellVariant, NavItem[]> = {
  platform: [
    { href: '/platform', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/platform/organizations', label: 'Organizations', icon: Building2 },
    { href: '/platform/plans', label: 'Plans', icon: Package },
    { href: '/platform/transactions', label: 'Transactions', icon: Receipt },
  ],
  organization: [
    { href: '/organization', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/organization/profile', label: 'Organization', icon: Building2 },
    { href: '/organization/members', label: 'Members', icon: Users },
    { href: '/organization/subscription', label: 'Subscription', icon: Package },
    { href: '/organization/billing', label: 'Billing', icon: CreditCard },
    { href: '/organization/transactions', label: 'Transactions', icon: Receipt },
  ],
  member: [
    { href: '/member', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/member/organization', label: 'Organization', icon: Building2 },
  ],
};

const accountHref: Partial<Record<AppShellVariant, string>> = {
  organization: '/organization/account',
  platform: undefined,
  member: '/member/profile',
};

const accountLabel: Partial<Record<AppShellVariant, string>> = {
  organization: 'My account',
  member: 'Profile',
};

function pageTitleFromPath(
  pathname: string,
  items: NavItem[],
  shellTitle: string,
  accountTitle = 'Profile',
) {
  const exact = items.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const nested = [...items]
    .filter((item) => item.href !== items[0]?.href)
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname.startsWith(item.href));
  if (nested) return nested.label;
  if (pathname.includes('/account') || pathname.includes('/profile')) return accountTitle;
  return shellTitle;
}

interface AppShellProps {
  variant: AppShellVariant;
  children: React.ReactNode;
}

export function AppShell({ variant, children }: AppShellProps) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen);
  const { user, logout, isLoggingOut } = useAuth();
  const items = navConfig[variant];
  const profileHref = accountHref[variant];
  const profileLabel = accountLabel[variant] ?? 'Profile';

  const shellTitle =
    variant === 'platform'
      ? 'Platform Admin'
      : variant === 'organization'
        ? 'Organization Admin'
        : 'Member';

  const pageTitle = pageTitleFromPath(pathname, items, shellTitle, profileLabel);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
          <Link href={items[0].href} className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
              OF
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">OrgFlow</span>
              <span className="block truncate text-[11px] text-[var(--sidebar-muted)]">
                {shellTitle}
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-slate-300 hover:bg-[var(--sidebar-hover)] hover:text-white lg:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== items[0].href && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => dispatch(setSidebarOpen(false))}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)]'
                    : 'text-slate-300 hover:bg-[var(--sidebar-hover)] hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-[var(--sidebar-border)] p-4">
          {profileHref ? (
            <Link
              href={profileHref}
              onClick={() => dispatch(setSidebarOpen(false))}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-[var(--sidebar-hover)] hover:text-white',
                pathname.startsWith(profileHref) && 'bg-[var(--sidebar-active)] text-white',
              )}
            >
                <Settings className="h-4 w-4" aria-hidden />
              {profileLabel}
            </Link>
          ) : null}
          <div className="px-2">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-[var(--sidebar-muted)]">{user?.email}</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => dispatch(toggleSidebar())}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{shellTitle}</p>
              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                {pageTitle}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {profileHref ? (
              <Link href={profileHref} className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" aria-label="Open profile">
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{user?.name?.split(' ')[0]}</span>
                </Button>
              </Link>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              disabled={isLoggingOut}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

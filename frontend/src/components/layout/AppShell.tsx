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
    { href: '/organization/profile', label: 'Profile', icon: Settings },
    { href: '/organization/members', label: 'Members', icon: Users },
    { href: '/organization/subscription', label: 'Subscription', icon: Package },
    { href: '/organization/billing', label: 'Billing', icon: CreditCard },
    { href: '/organization/transactions', label: 'Transactions', icon: Receipt },
  ],
  member: [
    { href: '/member', label: 'Profile', icon: User },
    { href: '/member/organization', label: 'Organization', icon: Building2 },
  ],
};

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

  const title =
    variant === 'platform'
      ? 'Platform Admin'
      : variant === 'organization'
        ? 'Organization'
        : 'Member Portal';

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Link href={items[0].href} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 text-sm font-bold text-white">
              OF
            </div>
            <span className="font-semibold text-slate-900">OrgFlow</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
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
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => dispatch(toggleSidebar())}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium text-slate-500">{title}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()} disabled={isLoggingOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}

/** Compact metric tile — flat SaaS style, no heavy chrome. */
export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-white p-5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--primary)]">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="mt-auto space-y-1">
        <div className="text-[1.65rem] font-semibold leading-none tracking-tight text-[var(--ink)]">
          {value}
        </div>
        {hint ? <p className="text-xs leading-relaxed text-[var(--muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

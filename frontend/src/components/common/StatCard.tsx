import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex h-full flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {Icon ? (
            <span className="rounded-lg bg-slate-50 p-2 text-slate-500 ring-1 ring-slate-100">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
        </div>
        <div className="mt-auto space-y-1">
          <div className="text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
          {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

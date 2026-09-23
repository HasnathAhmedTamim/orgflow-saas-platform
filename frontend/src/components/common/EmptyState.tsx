import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({
  title = 'No data yet',
  description = 'There is nothing to show here.',
  action,
  className,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 border border-dashed border-[var(--border)] bg-[var(--background)] px-6 py-12 text-center',
        className,
      )}
      role="status"
    >
      <Icon className="h-5 w-5 text-[var(--muted)]" aria-hidden />
      <div className="max-w-sm">
        <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

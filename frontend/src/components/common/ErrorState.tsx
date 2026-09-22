import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = "We couldn't load this content. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-red-100 bg-red-50/40 px-6 py-14 text-center',
        className,
      )}
      role="alert"
    >
      <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-red-100">
        <AlertCircle className="h-6 w-6 text-red-600" aria-hidden />
      </div>
      <div className="max-w-md">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

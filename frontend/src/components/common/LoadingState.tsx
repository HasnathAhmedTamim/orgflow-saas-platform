import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-slate-500', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

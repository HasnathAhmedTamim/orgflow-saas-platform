import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-blue-50 text-blue-800',
        secondary: 'bg-slate-100 text-slate-700',
        success: 'bg-emerald-50 text-emerald-800',
        warning: 'bg-amber-50 text-amber-800',
        destructive: 'bg-red-50 text-red-800',
        outline: 'border border-slate-200 text-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

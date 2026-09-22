import { Badge } from '@/components/ui/badge';

type StatusKind = string;

const statusMap: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
  }
> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
  TRIAL: { label: 'Trial', variant: 'warning' },
  PENDING: { label: 'Pending', variant: 'warning' },
  DISABLED: { label: 'Disabled', variant: 'destructive' },
  SUCCEEDED: { label: 'Success', variant: 'success' },
  SUCCESS: { label: 'Success', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  EXPIRED: { label: 'Expired', variant: 'secondary' },
  REFUNDED: { label: 'Refunded', variant: 'secondary' },
  ROLLED_BACK: { label: 'Rolled back', variant: 'outline' },
  PAST_DUE: { label: 'Past due', variant: 'warning' },
};

interface StatusBadgeProps {
  status: StatusKind;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? {
    label: status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    variant: 'outline' as const,
  };

  return (
    <Badge variant={config.variant} title={config.label}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {config.label}
    </Badge>
  );
}

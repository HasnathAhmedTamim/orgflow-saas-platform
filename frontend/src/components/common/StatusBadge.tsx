import { Badge } from '@/components/ui/badge';

type StatusKind =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'TRIAL'
  | 'PENDING'
  | 'DISABLED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'PAST_DUE'
  | 'COMPLETED'
  | 'REFUNDED'
  | string;

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
  TRIAL: { label: 'Trial', variant: 'warning' },
  PENDING: { label: 'Pending', variant: 'warning' },
  DISABLED: { label: 'Disabled', variant: 'destructive' },
  SUCCEEDED: { label: 'Succeeded', variant: 'success' },
  SUCCESS: { label: 'Success', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  EXPIRED: { label: 'Expired', variant: 'secondary' },
  REFUNDED: { label: 'Refunded', variant: 'secondary' },
  ROLLED_BACK: { label: 'Rolled back', variant: 'outline' },
};

interface StatusBadgeProps {
  status: StatusKind;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

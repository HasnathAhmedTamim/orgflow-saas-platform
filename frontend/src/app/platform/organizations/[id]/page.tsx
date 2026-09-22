'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/common/DataTable';
import { formatDate } from '@/lib/utils';
import type { OrgStatus } from '@/lib/types';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

export default function PlatformOrganizationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'SUSPENDED' | 'ACTIVE' | null>(null);

  const orgQuery = useQuery({
    queryKey: ['admin', 'organization', id],
    queryFn: () => adminApi.getOrganization(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrgStatus) => adminApi.updateOrgStatus(id, status),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organization', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      setConfirmAction(null);
      toast.success(
        status === 'SUSPENDED' ? 'Organization suspended' : 'Organization reactivated',
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update organization status');
    },
  });

  if (orgQuery.isLoading) return <LoadingState />;
  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState onRetry={() => orgQuery.refetch()} />;
  }

  const org = orgQuery.data;
  const users = org.users ?? [];

  return (
    <div>
      <PageHeader
        title={org.name}
        description={`Organization ID: ${org.id}`}
        actions={
          <div className="flex gap-2">
            {org.status !== 'SUSPENDED' && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmAction('SUSPENDED')}>
                Suspend
              </Button>
            )}
            {org.status === 'SUSPENDED' && (
              <Button size="sm" onClick={() => setConfirmAction('ACTIVE')}>
                Reactivate
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={org.status} />
            </div>
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-slate-500">Contact email</span>
              <span className="truncate text-right" title={org.contactEmail ?? undefined}>
                {org.contactEmail ?? '—'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-slate-500">Billing email</span>
              <span className="truncate text-right" title={org.billingEmail ?? undefined}>
                {org.billingEmail ?? '—'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Created</span>
              <span>{org.createdAt ? formatDate(org.createdAt) : '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {org.subscriptions && org.subscriptions.length > 0 ? (
              <div className="space-y-2">
                <p>
                  <span className="text-slate-500">Plan:</span>{' '}
                  {org.subscriptions[0].plan.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Status:</span>
                  <StatusBadge status={org.subscriptions[0].status} />
                </div>
              </div>
            ) : (
              <p className="text-slate-500">No subscription on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={users}
            getRowKey={(row) => row.id}
            emptyTitle="No members"
            emptyDescription="This organization has no users yet."
            columns={[
              { key: 'name', header: 'Name', cell: (row) => row.name },
              {
                key: 'email',
                header: 'Email',
                cell: (row) => (
                  <span className="block max-w-[220px] truncate" title={row.email}>
                    {row.email}
                  </span>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                cell: (row) => row.role.replace(/_/g, ' '),
              },
              { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'SUSPENDED' ? 'Suspend organization?' : 'Reactivate organization?'}
        description={
          confirmAction === 'SUSPENDED'
            ? 'Members will lose access until reactivated.'
            : 'Members will regain access to the organization.'
        }
        confirmLabel={confirmAction === 'SUSPENDED' ? 'Suspend' : 'Reactivate'}
        variant={confirmAction === 'SUSPENDED' ? 'destructive' : 'default'}
        loading={statusMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && statusMutation.mutate(confirmAction)}
      />
    </div>
  );
}

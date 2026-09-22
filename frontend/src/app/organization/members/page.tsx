'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';
import type { Member } from '@/lib/types';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ORG_ADMIN', 'MEMBER']),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function OrganizationMembersPage() {
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const membersQuery = useQuery({
    queryKey: ['organization', 'members'],
    queryFn: organizationsApi.listMembers,
  });

  const inviteMutation = useMutation({
    mutationFn: organizationsApi.inviteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      inviteForm.reset({ role: 'MEMBER' });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ORG_ADMIN' | 'MEMBER' }) =>
      organizationsApi.updateMember(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'members'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => organizationsApi.removeMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      setRemoveTarget(null);
    },
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'MEMBER' },
  });

  if (membersQuery.isLoading) return <LoadingState />;
  if (membersQuery.isError) return <ErrorState onRetry={() => membersQuery.refetch()} />;

  return (
    <div>
      <PageHeader title="Members" description="Invite and manage organization members" />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input id="inviteEmail" type="email" {...inviteForm.register('email')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inviteRole">Role</Label>
              <select
                id="inviteRole"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...inviteForm.register('role')}
              >
                <option value="MEMBER">Member</option>
                <option value="ORG_ADMIN">Org Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending...' : 'Send invite'}
            </Button>
          </form>
          {inviteMutation.isSuccess && (
            <p className="mt-2 text-sm text-teal-700">Invitation sent to {inviteMutation.data.email}</p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-slate-200 bg-white">
        <DataTable
          data={membersQuery.data ?? []}
          getRowKey={(row) => row.id}
          emptyTitle="No members yet"
          columns={[
            { key: 'name', header: 'Name', cell: (row) => row.name },
            { key: 'email', header: 'Email', cell: (row) => row.email },
            {
              key: 'role',
              header: 'Role',
              cell: (row) => (
                <select
                  value={row.role}
                  onChange={(e) =>
                    updateRoleMutation.mutate({
                      id: row.id,
                      role: e.target.value as 'ORG_ADMIN' | 'MEMBER',
                    })
                  }
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ORG_ADMIN">Org Admin</option>
                </select>
              ),
            },
            { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
            { key: 'joined', header: 'Joined', cell: (row) => formatDate(row.createdAt) },
            {
              key: 'actions',
              header: '',
              cell: (row) => (
                <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(row)}>
                  Remove
                </Button>
              ),
            },
          ]}
        />
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member?"
        description={`Remove ${removeTarget?.name} from the organization?`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeMutation.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}

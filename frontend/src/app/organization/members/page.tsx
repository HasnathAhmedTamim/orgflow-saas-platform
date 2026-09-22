'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Member } from '@/lib/types';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/use-auth';
import { Users } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['ORG_ADMIN', 'MEMBER']),
});

type InviteForm = z.infer<typeof inviteSchema>;

function roleLabel(role: string) {
  return role === 'ORG_ADMIN' ? 'Org Admin' : role === 'MEMBER' ? 'Member' : role.replace(/_/g, ' ');
}

export default function OrganizationMembersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const membersQuery = useQuery({
    queryKey: ['organization', 'members'],
    queryFn: organizationsApi.listMembers,
  });

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'MEMBER' },
  });

  const inviteMutation = useMutation({
    mutationFn: organizationsApi.inviteMember,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['organization', 'me'] });
      inviteForm.reset({ email: '', role: 'MEMBER' });
      toast.success(`Invitation sent to ${data.email}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send invitation');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'ORG_ADMIN' | 'MEMBER' }) =>
      organizationsApi.updateMember(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      toast.success('Member role updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update role');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => organizationsApi.removeMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['organization', 'me'] });
      setRemoveTarget(null);
      toast.success('Member removed');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to remove member');
    },
  });

  const filtered = useMemo(() => {
    const rows = membersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((m) => {
      if (roleFilter && m.role !== roleFilter) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }, [membersQuery.data, search, roleFilter, statusFilter]);

  if (membersQuery.isLoading) return <DashboardSkeleton />;
  if (membersQuery.isError) {
    return (
      <ErrorState
        message="We couldn't load your members."
        onRetry={() => membersQuery.refetch()}
      />
    );
  }

  const total = membersQuery.data?.length ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm">Team</span>
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Members</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Invite teammates, update roles, and remove access when needed.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{total}</span> total
            {filtered.length !== total ? (
              <span> · showing {filtered.length}</span>
            ) : null}
          </p>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
          <CardDescription>They will receive an email invitation to join this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))}
            className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                aria-invalid={!!inviteForm.formState.errors.email}
                aria-describedby={
                  inviteForm.formState.errors.email ? 'inviteEmail-error' : undefined
                }
                {...inviteForm.register('email')}
              />
              {inviteForm.formState.errors.email ? (
                <p id="inviteEmail-error" className="text-xs text-red-600" role="alert">
                  {inviteForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteRole">Role</Label>
              <Select id="inviteRole" {...inviteForm.register('role')}>
                <option value="MEMBER">Member</option>
                <option value="ORG_ADMIN">Org Admin</option>
              </Select>
            </div>
            <Button type="submit" disabled={inviteMutation.isPending} className="w-full sm:w-auto">
              {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Member list</CardTitle>
            <CardDescription>Search and filter your organization roster</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search members"
              className="sm:w-52"
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="sm:w-36"
            >
              <option value="">All roles</option>
              <option value="MEMBER">Member</option>
              <option value="ORG_ADMIN">Org Admin</option>
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="sm:w-36"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="PENDING">Pending</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          <div className="overflow-x-auto border-t border-slate-100">
            <DataTable
              data={filtered}
              getRowKey={(row) => row.id}
              emptyTitle={total === 0 ? 'No members yet' : 'No matching members'}
              emptyDescription={
                total === 0
                  ? 'Invite your first team member to get started.'
                  : 'Try a different search or clear filters.'
              }
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  cell: (row) => (
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {row.name}
                        {row.id === user?.id ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>
                        ) : null}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'email',
                  header: 'Email',
                  cell: (row) => (
                    <span
                      className="block max-w-[220px] truncate text-slate-600"
                      title={row.email}
                    >
                      {row.email}
                    </span>
                  ),
                },
                {
                  key: 'role',
                  header: 'Role',
                  cell: (row) =>
                    row.id === user?.id ? (
                      <Badge variant="secondary">{roleLabel(row.role)}</Badge>
                    ) : (
                      <Select
                        value={row.role}
                        aria-label={`Role for ${row.name}`}
                        disabled={updateRoleMutation.isPending}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            id: row.id,
                            role: e.target.value as 'ORG_ADMIN' | 'MEMBER',
                          })
                        }
                        className="h-8 w-auto min-w-[8rem] text-xs"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ORG_ADMIN">Org Admin</option>
                      </Select>
                    ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: 'joined',
                  header: 'Joined',
                  cell: (row) => (
                    <span className="whitespace-nowrap text-slate-600">
                      {formatDate(row.createdAt)}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  cell: (row) =>
                    row.id === user?.id ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => setRemoveTarget(row)}
                      >
                        Remove
                      </Button>
                    ),
                },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member?"
        description={`Remove ${removeTarget?.name} (${removeTarget?.email}) from the organization? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeMutation.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '@/lib/api/plans';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Plan } from '@/lib/types';

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceCents: z.coerce.number().int().positive(),
  currency: z.string().length(3).optional(),
  interval: z.enum(['MONTHLY', 'YEARLY']),
  features: z.string().optional(),
  isActive: z.boolean().optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

export default function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);

  const plansQuery = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: plansApi.listAll,
  });

  const createMutation = useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      reset();
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof plansApi.update>[1] }) =>
      plansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      reset();
      setEditing(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { currency: 'usd', interval: 'MONTHLY', isActive: true },
  });

  const startEdit = (plan: Plan) => {
    setEditing(plan);
    reset({
      name: plan.name,
      description: plan.description ?? '',
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features.join('\n'),
      isActive: plan.isActive,
    });
  };

  const onSubmit = (values: PlanFormValues) => {
    const payload = {
      ...values,
      currency: values.currency || 'usd',
      features: values.features ? values.features.split('\n').filter(Boolean) : [],
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (plan: Plan) => {
    updateMutation.mutate({ id: plan.id, data: { isActive: !plan.isActive } });
  };

  if (plansQuery.isLoading) return <LoadingState />;
  if (plansQuery.isError) return <ErrorState onRetry={() => plansQuery.refetch()} />;

  return (
    <div>
      <PageHeader title="Plans" description="Create and manage subscription plans" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All plans</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={plansQuery.data ?? []}
              getRowKey={(row) => row.id}
              emptyTitle="No plans yet"
              columns={[
                { key: 'name', header: 'Name', cell: (row) => row.name },
                {
                  key: 'price',
                  header: 'Price',
                  cell: (row) =>
                    `${formatCurrency(row.priceCents, row.currency)}/${row.interval.toLowerCase()}`,
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (row) => (
                    <StatusBadge status={row.isActive ? 'ACTIVE' : 'DISABLED'} />
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  cell: (row) => (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(row)}>
                        {row.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? 'Edit plan' : 'Create plan'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="priceCents">Price (cents)</Label>
                  <Input id="priceCents" type="number" {...register('priceCents')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="interval">Interval</Label>
                  <select id="interval" className="h-10 w-full rounded-md border border-slate-300 px-2 text-sm" {...register('interval')}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="features">Features (one per line)</Label>
                <textarea
                  id="features"
                  rows={4}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  {...register('features')}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Save changes' : 'Create plan'}
                </Button>
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      reset({ currency: 'usd', interval: 'MONTHLY', isActive: true });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

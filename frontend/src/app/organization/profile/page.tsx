'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationsApi } from '@/lib/api/organizations';
import { authApi } from '@/lib/api/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { AUTH_QUERY_KEY } from '@/hooks/use-auth';

const orgSchema = z.object({
  name: z.string().min(2).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(40).optional(),
  billingEmail: z.string().email().optional().or(z.literal('')),
});

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type OrgForm = z.infer<typeof orgSchema>;
type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function OrganizationProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const orgQuery = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMe,
  });

  const orgForm = useForm<OrgForm>({ resolver: zodResolver(orgSchema) });
  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (orgQuery.data) {
      orgForm.reset({
        name: orgQuery.data.name,
        contactEmail: orgQuery.data.contactEmail ?? '',
        contactPhone: orgQuery.data.contactPhone ?? '',
        billingEmail: orgQuery.data.billingEmail ?? '',
      });
    }
  }, [orgQuery.data, orgForm]);

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name, email: user.email });
    }
  }, [user, profileForm]);

  const orgMutation = useMutation({
    mutationFn: organizationsApi.updateMe,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'me'] }),
  });

  const profileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => passwordForm.reset(),
  });

  if (orgQuery.isLoading) return <LoadingState />;
  if (orgQuery.isError) return <ErrorState onRetry={() => orgQuery.refetch()} />;

  return (
    <div>
      <PageHeader title="Profile & settings" description="Manage your account and organization details" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="profileName">Name</Label>
                <Input id="profileName" {...profileForm.register('name')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="profileEmail">Email</Label>
                <Input id="profileEmail" type="email" {...profileForm.register('email')} />
              </div>
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving...' : 'Save profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit((v) =>
                passwordMutation.mutate({
                  currentPassword: v.currentPassword,
                  newPassword: v.newPassword,
                }),
              )}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newPassword">New password</Label>
                <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
              </div>
              {passwordMutation.isSuccess && (
                <p className="text-sm text-teal-700">{passwordMutation.data.message}</p>
              )}
              <Button type="submit" disabled={passwordMutation.isPending}>
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={orgForm.handleSubmit((v) =>
                orgMutation.mutate({
                  ...v,
                  contactEmail: v.contactEmail || null,
                  billingEmail: v.billingEmail || null,
                  contactPhone: v.contactPhone || null,
                }),
              )}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input id="orgName" {...orgForm.register('name')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" type="email" {...orgForm.register('contactEmail')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input id="contactPhone" {...orgForm.register('contactPhone')} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="billingEmail">Billing email</Label>
                <Input id="billingEmail" type="email" {...orgForm.register('billingEmail')} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={orgMutation.isPending}>
                  {orgMutation.isPending ? 'Saving...' : 'Save organization'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

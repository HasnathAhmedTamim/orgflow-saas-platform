'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, AUTH_QUERY_KEY } from '@/hooks/use-auth';
import { StatusBadge } from '@/components/common/StatusBadge';

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

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function MemberProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name, email: user.email });
    }
  }, [user, profileForm]);

  const profileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => queryClient.setQueryData(AUTH_QUERY_KEY, data),
  });

  const passwordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => passwordForm.reset(),
  });

  return (
    <div>
      <PageHeader title="My profile" description="Manage your personal account settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Status:</span>
              {user?.status && <StatusBadge status={user.status} />}
            </div>
            <form
              onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...profileForm.register('name')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...profileForm.register('email')} />
              </div>
              <Button type="submit" disabled={profileMutation.isPending}>
                Save profile
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
              <Button type="submit" disabled={passwordMutation.isPending}>
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

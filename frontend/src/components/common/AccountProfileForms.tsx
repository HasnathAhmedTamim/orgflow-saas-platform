'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth, AUTH_QUERY_KEY } from '@/hooks/use-auth';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function AccountProfileForms() {
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
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, data);
      toast.success('Profile updated successfully');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update profile');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      passwordForm.reset();
      toast.success('Password updated successfully');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to change password');
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>Your name and email for this account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-slate-800">
              {user?.role?.replace(/_/g, ' ')}
            </span>
            {user?.status ? <StatusBadge status={user.status} /> : null}
          </div>
          <form
            onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))}
            className="space-y-3"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" {...profileForm.register('name')} />
              {profileForm.formState.errors.name ? (
                <p className="text-xs text-red-600" role="alert">
                  {profileForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" type="email" {...profileForm.register('email')} />
              {profileForm.formState.errors.email ? (
                <p className="text-xs text-red-600" role="alert">
                  {profileForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password</CardDescription>
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
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <PasswordInput
                id="currentPassword"
                autoComplete="current-password"
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword ? (
                <p className="text-xs text-red-600" role="alert">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput
                id="newPassword"
                autoComplete="new-password"
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword ? (
                <p className="text-xs text-red-600" role="alert">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword ? (
                <p className="text-xs text-red-600" role="alert">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Updating…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

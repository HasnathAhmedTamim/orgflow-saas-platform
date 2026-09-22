import { apiClient } from './client';
import type { User } from '@/lib/types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  organizationName: string;
  adminName: string;
  email: string;
  password: string;
  planId: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  login: (input: LoginInput) =>
    apiClient<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  logout: () =>
    apiClient<null>('/auth/logout', { method: 'POST' }),

  refresh: () =>
    apiClient<{ user: User }>('/auth/refresh', { method: 'POST' }),

  me: () => apiClient<User>('/auth/me'),

  updateProfile: (input: UpdateProfileInput) =>
    apiClient<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  changePassword: (input: ChangePasswordInput) =>
    apiClient<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  forgotPassword: (email: string) =>
    apiClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiClient<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

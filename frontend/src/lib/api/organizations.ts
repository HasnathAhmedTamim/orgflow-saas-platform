import { apiClient } from './client';
import type { Member, Organization, Role } from '@/lib/types';

export interface UpdateOrgInput {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  billingEmail?: string | null;
}

export interface InviteMemberInput {
  email: string;
  role: 'ORG_ADMIN' | 'MEMBER';
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

export const organizationsApi = {
  getMe: () => apiClient<Organization>('/organizations/me'),

  updateMe: (input: UpdateOrgInput) =>
    apiClient<Organization>('/organizations/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  listMembers: () => apiClient<Member[]>('/organizations/me/members'),

  inviteMember: (input: InviteMemberInput) =>
    apiClient<{ id: string; email: string; role: Role; status: string; expiresAt: string }>(
      '/organizations/me/members/invite',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  updateMember: (id: string, role: 'ORG_ADMIN' | 'MEMBER') =>
    apiClient<Member>(`/organizations/me/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (id: string) =>
    apiClient<{ message: string }>(`/organizations/me/members/${id}`, {
      method: 'DELETE',
    }),

  acceptInvite: (input: AcceptInviteInput) =>
    apiClient<{ user: Member }>('/organizations/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

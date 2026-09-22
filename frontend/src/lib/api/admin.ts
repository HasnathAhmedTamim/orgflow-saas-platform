import { apiClient, buildQuery } from './client';
import type {
  AdminOrgListItem,
  AdminStats,
  OrgStatus,
  Organization,
  Paginated,
  Transaction,
} from '@/lib/types';

export const adminApi = {
  stats: () => apiClient<AdminStats>('/admin/stats'),

  listOrganizations: (params?: {
    search?: string;
    status?: OrgStatus;
    page?: number;
    limit?: number;
  }) =>
    apiClient<Paginated<AdminOrgListItem>>(
      `/admin/organizations${buildQuery(params ?? {})}`,
    ),

  getOrganization: (id: string) =>
    apiClient<Organization & { users?: Array<{ id: string; name: string; email: string; role: string; status: string }> }>(
      `/admin/organizations/${id}`,
    ),

  updateOrgStatus: (id: string, status: OrgStatus) =>
    apiClient<Organization>(`/admin/organizations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listTransactions: (params?: {
    organizationId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient<Paginated<Transaction>>(
      `/admin/transactions${buildQuery(params ?? {})}`,
    ),
};

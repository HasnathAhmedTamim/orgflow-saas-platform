import { apiClient } from './client';
import type { Plan, PlanInterval } from '@/lib/types';

export interface PlanInput {
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  interval: PlanInterval;
  features?: string[];
  isActive?: boolean;
}

export const plansApi = {
  listPublic: () => apiClient<Plan[]>('/plans'),

  listAll: () => apiClient<Plan[]>('/plans/all'),

  create: (input: PlanInput) =>
    apiClient<Plan>('/plans', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<PlanInput>) =>
    apiClient<Plan>(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

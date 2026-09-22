import { apiClient, API_BASE } from './client';
import type {
  CheckoutResponse,
  Payment,
  RegisterResponse,
  Subscription,
  Transaction,
} from '@/lib/types';
import type { RegisterInput } from '@/lib/api/auth';

export const paymentsApi = {
  register: (input: RegisterInput) =>
    apiClient<RegisterResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  retryRegistration: (pendingId: string) =>
    apiClient<CheckoutResponse>(`/register/${pendingId}/retry`, {
      method: 'POST',
    }),

  mySubscription: () => apiClient<Subscription | null>('/subscriptions/me'),

  upgrade: (planId: string) =>
    apiClient<CheckoutResponse>('/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  downgrade: (planId: string) =>
    apiClient<CheckoutResponse>('/subscriptions/downgrade', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  cancelSubscription: () =>
    apiClient<Subscription>('/subscriptions/cancel', { method: 'POST' }),

  listPayments: () => apiClient<Payment[]>('/payments'),

  listTransactions: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient<Transaction[]>(`/transactions${qs}`);
  },

  openBillingPortal: () =>
    apiClient<{ url: string }>('/billing/portal', { method: 'POST' }),

  downloadInvoice: async (paymentId: string) => {
    const response = await fetch(`${API_BASE}/payments/${paymentId}/invoice`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${paymentId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

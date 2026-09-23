import type { ApiResponse } from '@/lib/types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Prefer first Zod field error over generic "Validation failed". */
export function formatApiErrorMessage(body: Pick<ApiResponse, 'message' | 'details'>): string {
  const details = body.details;
  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const fieldErrors = details as Record<string, string[] | string | undefined>;
    for (const value of Object.values(fieldErrors)) {
      if (Array.isArray(value) && value[0]) return String(value[0]);
      if (typeof value === 'string' && value) return value;
    }
  }
  return body.message || 'Request failed';
}

let refreshPromise: Promise<void> | null = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new ApiError('Session expired', 401, 'UNAUTHORIZED');
        }
        const body = (await res.json()) as ApiResponse;
        if (!body.success) {
          throw new ApiError(formatApiErrorMessage(body), 401, body.code, body.details);
        }
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    try {
      await refreshSession();
      return apiClient<T>(path, options, false);
    } catch {
      throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
    }
  }

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('Invalid response from server', response.status);
  }

  if (!response.ok || !body.success) {
    throw new ApiError(
      formatApiErrorMessage(body),
      response.status,
      body.code,
      body.details,
    );
  }

  return body.data as T;
}

export function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

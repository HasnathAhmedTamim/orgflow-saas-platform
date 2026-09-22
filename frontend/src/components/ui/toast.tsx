'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type ToastInput = { type: ToastType; message: string };

type ToastContextValue = {
  push: (toast: ToastInput) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let externalPush: ((toast: ToastInput) => void) | null = null;

/** Call from anywhere (hooks, mutations) without importing React context. */
export const toast = {
  success: (message: string) => externalPush?.({ type: 'success', message }),
  error: (message: string) => externalPush?.({ type: 'error', message }),
  info: (message: string) => externalPush?.({ type: 'info', message }),
};

const styles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-slate-200 bg-white text-slate-800',
};

const labels: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev, { id, ...input }].slice(-4));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    externalPush = push;
    return () => {
      externalPush = null;
    };
  }, [push]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message) => push({ type: 'success', message }),
      error: (message) => push({ type: 'error', message }),
      info: (message) => push({ type: 'info', message }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(100%-2rem,24rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg ${styles[item.type]}`}
            role="status"
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {labels[item.type]}
            </p>
            <p className="mt-0.5 text-sm font-medium">{item.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

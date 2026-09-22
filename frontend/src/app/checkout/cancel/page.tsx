'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { paymentsApi } from '@/lib/api/payments';
import { ApiError } from '@/lib/api/client';
import { XCircle } from 'lucide-react';
import { SearchParamsBoundary } from '@/components/common/SearchParamsBoundary';

function CheckoutCancelPageContent() {
  const searchParams = useSearchParams();
  const pendingId = searchParams.get('pending_id') ?? '';

  const retryMutation = useMutation({
    mutationFn: () => paymentsApi.retryRegistration(pendingId),
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });

  const errorMessage =
    retryMutation.error instanceof ApiError
      ? retryMutation.error.message
      : retryMutation.error
        ? 'Unable to retry checkout'
        : null;

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)]">
            <XCircle className="h-6 w-6 text-[#b54708]" aria-hidden />
          </div>
          <CardTitle className="text-xl">Checkout cancelled</CardTitle>
          <CardDescription>
            Your registration was not completed. You can retry checkout or start over.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {errorMessage ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
          {pendingId ? (
            <Button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="w-full"
            >
              {retryMutation.isPending ? 'Redirecting…' : 'Retry checkout'}
            </Button>
          ) : (
            <p className="text-center text-sm text-slate-500">No pending registration ID found.</p>
          )}
          <Link href="/register" className="block">
            <Button variant="outline" className="w-full">
              Start new registration
            </Button>
          </Link>
          <Link href="/login" className="block text-center text-sm text-[var(--primary)] hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <SearchParamsBoundary>
      <CheckoutCancelPageContent />
    </SearchParamsBoundary>
  );
}

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <XCircle className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle>Checkout cancelled</CardTitle>
          <CardDescription>
            Your registration was not completed. You can retry checkout or start over.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {errorMessage && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
          )}
          {pendingId ? (
            <Button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="w-full"
            >
              {retryMutation.isPending ? 'Redirecting...' : 'Retry checkout'}
            </Button>
          ) : (
            <p className="text-sm text-slate-500">No pending registration ID found.</p>
          )}
          <Link
            href="/register"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Start new registration
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

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/hooks/use-auth';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-shell flex min-h-screen items-center justify-center p-4">
        <LoadingState message="Checking session…" />
      </div>
    );
  }

  const isOrgAdmin = user?.role === 'ORG_ADMIN';
  const isMember = user?.role === 'MEMBER';
  const isPlatform = user?.role === 'PLATFORM_ADMIN';

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)]">
            <CheckCircle2 className="h-6 w-6 text-[var(--primary)]" aria-hidden />
          </div>
          <CardTitle className="text-xl">Payment successful</CardTitle>
          <CardDescription>
            {isOrgAdmin
              ? 'Stripe confirmed payment. Subscription and billing updates apply after the webhook finishes — usually within a few seconds.'
              : 'Your organization activation is processed after Stripe confirms payment. This may take a moment.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {isOrgAdmin ? (
            <>
              <p className="text-sm text-slate-600">
                Refresh subscription or billing if the new plan is not visible yet.
              </p>
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Link href="/organization/subscription">
                  <Button className="w-full sm:w-auto">Back to subscription</Button>
                </Link>
                <Link href="/organization/billing">
                  <Button variant="outline" className="w-full sm:w-auto">
                    View billing
                  </Button>
                </Link>
              </div>
            </>
          ) : isMember ? (
            <>
              <p className="text-sm text-slate-600">
                Your organization admin manages billing. You can return to your workspace.
              </p>
              <Link href="/member">
                <Button className="w-full sm:w-auto">Go to workspace</Button>
              </Link>
            </>
          ) : isPlatform ? (
            <Link href="/platform">
              <Button className="w-full sm:w-auto">Platform dashboard</Button>
            </Link>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Once activation completes, sign in with the email and password you used during
                registration.
              </p>
              <Link href="/login">
                <Button className="w-full sm:w-auto">Go to sign in</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

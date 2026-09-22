import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)]">
            <CheckCircle2 className="h-6 w-6 text-[var(--primary)]" aria-hidden />
          </div>
          <CardTitle className="text-xl">Payment successful</CardTitle>
          <CardDescription>
            Your organization activation is processed after Stripe confirms payment. This may take
            a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-600">
            Once activation completes, sign in with the email and password you used during
            registration.
          </p>
          <Link href="/login">
            <Button className="w-full sm:w-auto">Go to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

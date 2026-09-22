import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
          </div>
          <CardTitle>Payment received</CardTitle>
          <CardDescription>
            Your organization activation is processed via webhook after Stripe confirms payment.
            This may take a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-600">
            Once activation completes, sign in with the email and password you used during registration.
          </p>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-medium text-white hover:bg-teal-700"
          >
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

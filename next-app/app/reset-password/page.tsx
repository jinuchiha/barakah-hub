import { Suspense } from 'react';
import { Card, CardBody } from '@/components/ui/card';
import ResetForm from './reset-form';

export const metadata = { title: 'Reset Password · Barakah Hub' };
// Force dynamic — the form reads `?token=` from the query string, which
// requires Suspense + dynamic rendering rather than static prerendering.
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-[480px] max-w-full">
        <Card className="overflow-hidden">
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />
          <div className="border-b border-[var(--border)] bg-[rgba(201,168,76,0.04)] p-6 text-center">
            <h1 className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">🔐 نیا پاس ورڈ</h1>
            <div className="mt-1 font-[var(--font-en)] text-[11px] uppercase tracking-[3px] text-[var(--color-gold-4)]">Set a new password</div>
          </div>
          <CardBody>
            <Suspense fallback={<div className="h-32 animate-pulse rounded bg-[var(--surf-3)]" />}>
              <ResetForm />
            </Suspense>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

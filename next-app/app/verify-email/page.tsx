import { Crescent as CrescentMark } from '@/components/icons/crescent';
import VerifyForm from './verify-form';

export const metadata = { title: 'Verify Email · Barakah Hub' };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;

  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-8 text-center shadow-xl">
        <span className="mb-4 inline-grid size-12 place-items-center rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)]">
          <CrescentMark className="size-6 text-[var(--color-ink)]" title="" />
        </span>
        <h1 className="font-[var(--font-arabic)] text-2xl leading-[1.9] text-[var(--color-gold-2)]">ای میل کی تصدیق</h1>
        <p className="mb-1 font-[var(--font-display)] text-sm uppercase tracking-widest text-[var(--color-gold-4)]">Verify your email</p>
        <p className="mt-3 text-sm text-[var(--txt-2)]">
          {email ? <>A 6-digit code was sent to <strong className="text-[var(--color-cream)]">{email}</strong>.</> : 'Enter the 6-digit code from your email.'}
        </p>
        <VerifyForm email={email ?? ''} />
      </div>
    </main>
  );
}

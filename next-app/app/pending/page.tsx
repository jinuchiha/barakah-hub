import Link from 'next/link';
import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';

export const metadata = { title: 'Account Pending · Barakah Hub' };

export default async function PendingPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');

  const [me] = await db.select().from(members).where(eq(members.authId, session.user.id)).limit(1);
  if (!me) redirect('/onboarding');
  if (me.status === 'approved') redirect('/dashboard');
  if (me.status === 'rejected') redirect('/rejected' as any);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-8 text-center shadow-xl">
        <div className="mb-4 text-4xl">⏳</div>
        <h1 className="mb-2 font-[var(--font-arabic)] text-2xl text-[var(--color-gold-2)]">منظوری زیر التواء</h1>
        <p className="mb-1 font-[var(--font-display)] text-sm uppercase tracking-widest text-[var(--color-gold-4)]">Account Pending Approval</p>
        <p className="mt-4 text-sm text-[var(--txt-2)]">
          Your account has been registered. An admin will review and approve it shortly — you will receive a notification once approved.
        </p>
        <p dir="rtl" className="mt-2 font-[var(--font-arabic)] text-sm text-[var(--txt-3)]">
          آپ کی درخواست موصول ہو گئی ہے۔ ایڈمن جلد ہی آپ کے کھاتے کو منظور کریں گے۔
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--color-gold-4)] transition-colors hover:bg-[rgba(214,210,199,0.08)]"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

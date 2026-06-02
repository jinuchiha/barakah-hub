import Link from 'next/link';
import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';

export const metadata = { title: 'Account Rejected · Barakah Hub' };

export default async function RejectedPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');

  const [me] = await db.select().from(members).where(eq(members.authId, session.user.id)).limit(1);
  if (!me) redirect('/onboarding');
  if (me.status === 'approved') redirect('/dashboard');
  if (me.status === 'pending') redirect('/pending' as any);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-8 text-center shadow-xl">
        <div className="mb-4 text-4xl">🚫</div>
        <h1 className="mb-2 font-[var(--font-arabic)] text-2xl text-[var(--color-gold-2)]">درخواست مسترد</h1>
        <p className="mb-1 font-[var(--font-display)] text-sm uppercase tracking-widest text-[var(--color-gold-4)]">Account Not Approved</p>
        <p className="mt-4 text-sm text-[var(--txt-2)]">
          Your membership request was not approved. Please contact an admin for more information.
        </p>
        <p dir="rtl" className="mt-2 font-[var(--font-arabic)] text-sm text-[var(--txt-3)]">
          آپ کی رکنیت کی درخواست منظور نہیں ہوئی۔ مزید معلومات کے لیے ایڈمن سے رابطہ کریں۔
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

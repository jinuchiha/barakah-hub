import Link from 'next/link';
import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { members, config as configTbl } from '@/lib/db/schema';
import { getDailyVerse } from '@/lib/quran';

export const metadata = { title: 'Account Pending · Barakah Hub' };

export default async function PendingPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login');

  const [me] = await db.select().from(members).where(eq(members.authId, session.user.id)).limit(1);
  if (!me) redirect('/onboarding');
  if (me.status === 'approved') redirect('/dashboard');
  if (me.status === 'rejected') redirect('/rejected' as any);

  const [cfg] = await db.select({ orgNameUr: configTbl.orgNameUr, orgNameEn: configTbl.orgNameEn }).from(configTbl).where(eq(configTbl.id, 1)).limit(1);
  const verse = getDailyVerse();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-ink)] px-4 py-12">
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 text-[32px]">☾</div>
        <h2 className="font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">{cfg?.orgNameUr ?? 'بَرَكَة ہب'}</h2>
        <p className="text-[11px] uppercase tracking-[2px] text-[var(--txt-4)]">{cfg?.orgNameEn ?? 'Barakah Hub'}</p>
      </div>

      {/* Status card */}
      <div className="w-full max-w-md rounded-2xl border border-[rgba(200,155,60,0.20)] bg-[rgba(200,155,60,0.04)] p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[rgba(200,155,60,0.12)]">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="mb-1 font-[var(--font-arabic)] text-2xl text-[var(--color-gold-2)]">منظوری زیر التواء</h1>
        <p className="font-semibold uppercase tracking-widest text-[10px] text-[var(--color-gold-4)]">Awaiting Admin Approval</p>
        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4 text-left">
          <p className="text-sm leading-6 text-[var(--txt-2)]">
            Salaam <strong className="text-[var(--color-cream)]">{me.nameEn || me.nameUr}</strong> — your account has been registered. An admin will review and approve it shortly.
          </p>
          <p dir="rtl" className="mt-2 font-[var(--font-arabic)] text-sm leading-7 text-[var(--txt-3)]">
            آپ کی درخواست موصول ہو گئی ہے۔ منظوری ملنے پر آپ کو اطلاع بھیجی جائے گی۔
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <div className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-[11px] text-[var(--txt-3)]">
            ✓ Registered
          </div>
          <div className="rounded-full border border-[rgba(200,155,60,0.35)] bg-[rgba(200,155,60,0.08)] px-3 py-1.5 text-[11px] text-[var(--color-gold)]">
            ⏳ Pending approval
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-[11px] text-[var(--txt-4)]">
            ○ Active
          </div>
        </div>
      </div>

      {/* Daily verse — give them something meaningful to read while they wait */}
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(214,210,199,0.02)] p-6 text-center">
        <p className="mb-1 text-[9px] uppercase tracking-[2px] text-[var(--txt-4)]">Daily Reflection</p>
        <p dir="rtl" className="mb-3 font-[var(--font-arabic)] text-[15px] leading-8 text-[var(--color-gold-2)]">{verse.arabic}</p>
        <p className="text-[12.5px] italic leading-5 text-[var(--txt-3)]">&ldquo;{verse.english}&rdquo;</p>
        <p className="mt-1.5 text-[10px] text-[var(--txt-4)]">{verse.reference}</p>
      </div>

      <Link
        href="/login"
        className="text-[12px] text-[var(--txt-4)] underline-offset-2 hover:underline"
      >
        Sign out
      </Link>
    </div>
  );
}

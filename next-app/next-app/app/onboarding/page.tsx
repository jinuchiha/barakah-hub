import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { Card, CardBody } from '@/components/ui/card';
import OnboardingForm from './onboarding-form';

export const metadata = { title: 'Welcome · Barakah Hub' };

/**
 * Onboarding — for newly authenticated users without a `members` row yet,
 * OR who were imported from legacy data and need to claim their account.
 */
export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  // If they already have a members row linked, send them to dashboard
  const [existing] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (existing && !existing.needsSetup) redirect('/dashboard');

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-[540px] max-w-full">
        <Card>
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />
          <div className="border-b border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-6 text-center">
            <h1 className="font-[var(--font-arabic)] text-2xl text-[var(--color-gold-2)]">خوش آمدید — پروفائل مکمل کریں</h1>
            <div className="mt-1 font-[var(--font-en)] text-[11px] uppercase tracking-[3px] text-[var(--color-gold-4)]">Welcome — Complete your profile</div>
          </div>
          <CardBody>
            <div className="mb-4 rounded-md border border-[var(--border)] bg-[rgba(214,210,199,0.06)] p-3 text-center">
              <div className="font-[var(--font-arabic)] text-sm text-[var(--color-gold)]">وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ</div>
              <div className="mt-1 font-[var(--font-en)] text-[10px] italic text-[var(--txt-3)]">Cooperate in righteousness and piety · Al-Maidah 5:2</div>
            </div>
            <OnboardingForm existing={existing} />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth-server';
import { Crescent as CrescentMark } from '@/components/icons/crescent';
import LoginForm from './login-form';
import LoginScene from './login-scene';

export const metadata = { title: 'Sign In · Barakah Hub' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getUser();
  if (user) redirect('/dashboard');
  const { next } = await searchParams;

  return (
    <main className="relative min-h-svh overflow-x-clip">
      <BackgroundPattern />
      <LoginScene>
        <div className="relative overflow-hidden rounded-[var(--radius-r-lg)] border border-[var(--border-2)] bg-gradient-to-br from-[#1d2127] to-[#14171c] shadow-[0_24px_60px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.25)]">
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />
          <div className="border-b border-[var(--border)] bg-gradient-to-b from-[rgba(214,210,199,0.06)] to-transparent px-5 pb-6 pt-8 text-center sm:px-8">
            <Crescent />
            <h1 className="font-[var(--font-arabic)] text-2xl text-[var(--color-gold-2)]">بَرَكَة ہب</h1>
            <div className="mt-1.5 font-[var(--font-display)] text-[11px] uppercase tracking-[4px] text-[var(--color-gold-4)] opacity-80">
              Barakah Hub
            </div>
            <div className="mx-0 mt-4 rounded-md border border-[var(--border)] bg-[rgba(214,210,199,0.05)] p-3.5 text-center">
              <div className="font-[var(--font-arabic)] text-base text-[var(--color-gold)]">وَأَنفِقُوا فِي سَبِيلِ اللَّهِ</div>
              <div className="mt-1 text-[11px] italic text-white/55">Spend in the cause of Allah</div>
              <div className="mt-1 font-[var(--font-en)] text-[10px] tracking-[1px] text-[var(--color-gold-4)]">Al-Baqarah 2:195</div>
            </div>
          </div>
          <LoginForm next={next} />
        </div>
      </LoginScene>
    </main>
  );
}

function Crescent() {
  return (
    <span className="mb-3 inline-grid size-10 place-items-center rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)]" aria-hidden="true">
      <CrescentMark className="size-5 text-[var(--color-ink)]" title="" />
    </span>
  );
}

function BackgroundPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden="true">
      <svg viewBox="0 0 1200 900" className="size-full">
        <defs>
          <pattern id="geo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <polygon points="50,8 92,25 92,75 50,92 8,75 8,25" fill="none" stroke="#6f7480" strokeWidth="0.6" />
            <circle cx="50" cy="50" r="4" fill="none" stroke="#6f7480" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="1200" height="900" fill="url(#geo)" />
      </svg>
    </div>
  );
}

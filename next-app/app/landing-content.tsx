'use client';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import {
  HandCoins, Scale, HandHeart, Vote, EyeOff, ScrollText, ArrowRight,
} from 'lucide-react';
import { BarakahFieldMount } from '@/components/barakah-field-mount';
import { Crescent as CrescentMark } from '@/components/icons/crescent';

const EASE = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  { icon: HandHeart, title: 'Sadaqah', ur: 'صدقہ', desc: 'Monthly voluntary giving, pooled for the family. Donor names stay hidden from other members · the sunnah of secret charity, enforced in the database itself.' },
  { icon: Scale, title: 'Zakat', ur: 'زکوٰۃ', desc: 'A dedicated pool for obligatory alms, tracked separately and routed only to eligible recipients.' },
  { icon: HandCoins, title: 'Qarz-e-Hasana', ur: 'قرض حسنہ', desc: 'Interest-free loans from the fund, with repayment schedules the whole ledger can verify.' },
  { icon: Vote, title: 'Emergency Vote', ur: 'ہنگامی رائے', desc: 'A member in hardship opens a case; every approved member casts one vote. The majority decides, not any one person.' },
  { icon: EyeOff, title: 'Donor Privacy', ur: 'رازداری', desc: 'Community feeds show that sadaqah happened, never who gave it. Only the admin sees names.' },
  { icon: ScrollText, title: 'Append-only Audit', ur: 'آڈٹ', desc: 'Every rupee movement is written to a tamper-evident log the database refuses to edit or delete.' },
];

const STEPS = [
  { n: '١', title: 'Register', desc: 'Join with your family invite link. An admin approves every account before it sees anything.' },
  { n: '٢', title: 'Contribute', desc: 'Pledge monthly, send via EasyPaisa, attach the receipt. A supervisor and an admin verify each payment.' },
  { n: '٣', title: 'Support each other', desc: 'Vote on emergency cases, extend qarz-e-hasana, and watch the fund grow, together.' },
];

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingContent() {
  const reduce = useReducedMotion();
  const fadeUp = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 30, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.9, delay, ease: EASE },
  });

  return (
    <main className="relative min-h-screen overflow-hidden">
      <BarakahFieldMount />

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto flex min-h-[88svh] max-w-4xl flex-col items-center justify-center px-5 py-16 text-center sm:min-h-[92vh] sm:px-6">
        <motion.span {...fadeUp(0)} className="mb-6 inline-grid size-14 place-items-center rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)]">
          <CrescentMark className="size-7 text-[var(--color-ink)]" title="" />
        </motion.span>

        <motion.p {...fadeUp(0.12)} dir="rtl" lang="ar" className="font-[var(--font-quran)] text-lg leading-[2.2] text-[var(--color-gold-2)]">
          وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ…
        </motion.p>
        <motion.p {...fadeUp(0.18)} className="mt-1 text-[10.5px] tracking-[1px] text-[var(--txt-4)]">
          Al-Ma&rsquo;idah 5:2
        </motion.p>

        <motion.h1 {...fadeUp(0.24)} className="mt-4 font-[var(--font-display)] text-5xl leading-[1.02] tracking-[-1px] text-[var(--color-cream)] sm:text-6xl md:text-7xl">
          Barakah <em className="text-[var(--color-gold-2)]">Hub</em>
        </motion.h1>

        <motion.p {...fadeUp(0.38)} className="mt-6 max-w-xl text-[15px] leading-relaxed text-[var(--txt-3)]">
          A private treasury for your extended family: pool monthly sadaqah,
          issue interest-free loans, approve emergencies by majority vote, and
          keep every rupee on a ledger no one can quietly edit.
        </motion.p>

        <motion.div {...fadeUp(0.52)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] px-8 py-3 text-sm font-bold uppercase tracking-wide text-[var(--color-ink)] transition-transform hover:-translate-y-0.5">
            Sign in <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/register" className="inline-flex items-center rounded-full border border-[var(--border-2)] px-8 py-3 text-sm font-semibold tracking-wide text-[var(--txt-2)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold-2)]">
            Create an account
          </Link>
        </motion.div>

        <motion.p {...fadeUp(0.66)} className="mt-6 text-[11px] tracking-wide text-[var(--txt-4)]">
          Invite-only · every member approved by the family admin
        </motion.p>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <Reveal className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[3px] text-[var(--color-gold-4)]">What lives inside</p>
          <h2 className="mt-2 font-[var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">One fund, six disciplines</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-[var(--radius-r)] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-6 transition-colors duration-300 hover:border-[rgba(200,155,60,0.4)]">
                <div className="mb-4 grid size-9 place-items-center rounded-lg border border-[rgba(200,155,60,0.25)] bg-[rgba(200,155,60,0.08)] text-[var(--color-gold)] [&>svg]:size-4">
                  <f.icon aria-hidden />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-[var(--color-cream)]">{f.title}</h3>
                  <span className="font-[var(--font-arabic)] text-sm text-[var(--color-gold-4)]">{f.ur}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--txt-3)]">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 border-t border-[var(--border)] bg-[rgba(255,255,255,0.015)]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <Reveal className="mb-12 text-center">
            <h2 className="font-[var(--font-display)] text-3xl text-[var(--color-cream)] sm:text-4xl">How it works</h2>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1} className="text-center">
                <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full border border-[rgba(200,155,60,0.35)] font-[var(--font-arabic)] text-xl text-[var(--color-gold-2)]">
                  {s.n}
                </div>
                <h3 className="text-[15px] font-semibold text-[var(--color-cream)]">{s.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--txt-3)]">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing ayah + footer ── */}
      <footer className="relative z-10 border-t border-[var(--border)] px-6 py-14 text-center">
        <p dir="rtl" lang="ar" className="mx-auto max-w-lg font-[var(--font-quran)] text-base leading-[2.3] text-[var(--color-gold-4)]">
          مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ…
        </p>
        <p className="mt-3 text-[11px] italic text-[var(--txt-4)]">Like a seed that grows seven ears · Al-Baqarah 2:261</p>
        <p className="mt-8 text-[10.5px] tracking-wide text-[var(--txt-4)]">
          © {new Date().getFullYear()} Barakah Hub · <Link href="/login" className="hover:text-[var(--color-gold-2)]">Sign in</Link>
          {' · '}<Link href="/terms" className="hover:text-[var(--color-gold-2)]">Terms</Link>
          {' · '}<Link href="/privacy" className="hover:text-[var(--color-gold-2)]">Privacy</Link>
        </p>
      </footer>
    </main>
  );
}

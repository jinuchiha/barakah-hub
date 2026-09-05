'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { onboardSelf } from './actions';
import type { Member } from '@/lib/db/schema';

const PROVINCES = ['', 'balochistan', 'sindh', 'punjab', 'kpk', 'gilgit', 'azadkashmir', 'islamabad', 'overseas', 'other'];

// Display names for the province slugs — submitted values stay the slugs.
const PROVINCE_LABELS: Record<string, string> = {
  balochistan: 'Balochistan',
  sindh: 'Sindh',
  punjab: 'Punjab',
  kpk: 'Khyber Pakhtunkhwa',
  gilgit: 'Gilgit-Baltistan',
  azadkashmir: 'Azad Kashmir',
  islamabad: 'Islamabad',
  overseas: 'Overseas',
  other: 'Other',
};

interface Props { existing?: Member }

export default function OnboardingForm({ existing }: Props) {
  const [pending, start] = useTransition();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nameEn: existing?.nameEn || '',
    nameUr: existing?.nameUr || '',
    fatherName: existing?.fatherName || '',
    relation: existing?.relation || '',
    phone: existing?.phone || '',
    city: existing?.city || '',
    province: existing?.province || '',
  });
  const router = useRouter();

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm({ ...form, [k]: v }); }

  function next() {
    if (step === 1) {
      if (!form.nameEn) return toast.error('English name required');
      if (!form.fatherName) return toast.error('Father name required');
    }
    if (step === 2) {
      if (!form.phone) return toast.error('Phone required');
      if (!form.city) return toast.error('City required');
      if (!form.province) return toast.error('Province required');
    }
    setStep(step + 1);
  }

  function submit() {
    start(async () => {
      try {
        // Redeem the invite stored on /register (if any) — onboardSelf
        // validates and consumes it inside the insert transaction.
        let inviteToken: string | undefined;
        try { inviteToken = localStorage.getItem('bh_invite_token') ?? undefined; } catch { /* storage blocked */ }
        await onboardSelf({ ...form, inviteToken });
        try { localStorage.removeItem('bh_invite_token'); } catch { /* ignore */ }
        toast.success('Welcome · setup complete');
        router.replace('/dashboard');
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Setup failed'); }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) { next(); return; }
    // Validate step 2 before submitting — previously these checks only ran
    // on "Next", so the final submit skipped them and users got the server's
    // raw zod error instead.
    if (!form.phone) return void toast.error('Phone required');
    if (!form.city) return void toast.error('City required');
    if (!form.province) return void toast.error('Province required');
    submit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} aria-hidden="true" className={`grid size-8 place-items-center rounded-full font-[var(--font-display)] text-sm font-bold ${step > s ? 'bg-[var(--color-emerald-2)] text-white' : step === s ? 'bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] text-[var(--color-ink)]' : 'border border-[var(--border)] bg-[var(--surf-3)] text-[var(--color-gold-4)]'}`}>
            {step > s ? '✓' : s}
          </div>
        ))}
        <span className="sr-only">Step {step} of 2</span>
        <span className="ml-2 font-[var(--font-display)] text-[10px] uppercase tracking-[1.5px] text-[var(--color-gold-4)]">
          {step === 1 ? 'IDENTITY · شناخت' : 'CONTACT · رابطہ'}
        </span>
      </div>

      {step === 1 && (
        <>
          <p className="mb-4 text-[11px] text-[var(--txt-3)]">Your name + father&apos;s name. We use the father&apos;s name to build the family tree.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="English Name *"><Input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Ahmad Baloch" /></Field>
            <Field label="Urdu Name"><Input value={form.nameUr} onChange={(e) => set('nameUr', e.target.value)} dir="rtl" /></Field>
            <Field className="md:col-span-2" label={<>Father&apos;s Name *</>}><Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} /></Field>
            <Field className="md:col-span-2" label="Relation in family"><Input value={form.relation} onChange={(e) => set('relation', e.target.value)} placeholder="e.g. Son of / Daughter of" /></Field>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="mb-4 text-[11px] text-[var(--txt-3)]">Phone enables WhatsApp reminders for vote and dues.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Phone *"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" /></Field>
            <Field label="City *"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field className="md:col-span-2" label="Province *">
              <select value={form.province} onChange={(e) => set('province', e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
                <option value="">Select</option>
                {PROVINCES.slice(1).map((p) => <option key={p} value={p}>{PROVINCE_LABELS[p] ?? p}</option>)}
              </select>
            </Field>
          </div>
        </>
      )}

      <div className="mt-5 flex justify-between gap-2">
        <Button type="button" variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>← Back</Button>
        {step < 2 ? <Button type="submit" variant="gold">Next →</Button> : <Button type="submit" variant="gold" disabled={pending}>{pending ? 'Saving…' : '✓ Complete'}</Button>}
      </div>
    </form>
  );
}

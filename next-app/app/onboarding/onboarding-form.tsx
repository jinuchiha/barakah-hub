'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { onboardSelf } from './actions';
import type { Member } from '@/lib/db/schema';

const PROVINCES = ['', 'balochistan', 'sindh', 'punjab', 'kpk', 'gilgit', 'azadkashmir', 'islamabad', 'overseas', 'other'];

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
        await onboardSelf(form);
        toast.success('Welcome — setup complete ✨');
        router.replace('/dashboard');
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Setup failed'); }
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`grid size-8 place-items-center rounded-full font-[var(--font-display)] text-sm font-bold ${step > s ? 'bg-[var(--color-emerald-2)] text-white' : step === s ? 'bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] text-[var(--color-ink)]' : 'border border-[var(--border)] bg-[var(--surf-3)] text-[var(--color-gold-4)]'}`}>
            {step > s ? '✓' : s}
          </div>
        ))}
        <span className="ml-2 font-[var(--font-display)] text-[10px] uppercase tracking-[1.5px] text-[var(--color-gold-4)]">
          {step === 1 ? 'IDENTITY · شناخت' : 'CONTACT · رابطہ'}
        </span>
      </div>

      {step === 1 && (
        <>
          <p className="mb-4 text-xs italic text-[var(--color-gold-4)]">Your name + father&apos;s name. We use the father&apos;s name to build the family tree.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>English Name *</Label><Input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Ahmad Baloch" /></div>
            <div><Label>Urdu Name</Label><Input value={form.nameUr} onChange={(e) => set('nameUr', e.target.value)} dir="rtl" /></div>
            <div className="md:col-span-2"><Label>Father&apos;s Name *</Label><Input value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Relation in family</Label><Input value={form.relation} onChange={(e) => set('relation', e.target.value)} placeholder="e.g. Son of Abu Baker" /></div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="mb-4 text-xs italic text-[var(--color-gold-4)]">Phone enables WhatsApp reminders for vote and dues.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" /></div>
            <div><Label>City *</Label><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
            <div className="md:col-span-2">
              <Label>Province *</Label>
              <select value={form.province} onChange={(e) => set('province', e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
                <option value="">— Select —</option>
                {PROVINCES.slice(1).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="mt-5 flex justify-between gap-2">
        <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>← Back</Button>
        {step < 2 ? <Button variant="gold" onClick={next}>Next →</Button> : <Button variant="gold" disabled={pending} onClick={submit}>{pending ? 'Saving…' : '✓ Complete'}</Button>}
      </div>
    </>
  );
}

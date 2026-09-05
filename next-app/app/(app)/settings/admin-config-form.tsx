'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateAdminConfig, updateGoal } from '@/app/actions';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Config } from '@/lib/db/schema';

export default function AdminConfigForm({ config }: { config: Config }) {
  const [pending, start] = useTransition();
  const [thresh, setThresh] = useState(config.voteThresholdPct);
  const [defaultMonthly, setDefaultMonthly] = useState(config.defaultMonthlyPledge);
  const [goalAmount, setGoalAmount] = useState(config.goalAmount || 0);
  const [goalLabelEn, setGoalLabelEn] = useState(config.goalLabelEn || '');
  const [goalLabelUr, setGoalLabelUr] = useState(config.goalLabelUr || '');
  const [goalDeadline, setGoalDeadline] = useState((config.goalDeadline || '').toString());
  const [fautiAmount, setFautiAmount] = useState(config.fautiAmount || 0);
  const [easyPaiseName, setEasyPaiseName] = useState(config.easyPaiseName || '');
  const [easyPaiseNumber, setEasyPaiseNumber] = useState(config.easyPaiseNumber || '');

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await Promise.all([
          updateAdminConfig({
            voteThresholdPct: thresh,
            defaultMonthlyPledge: defaultMonthly,
            fautiAmount,
            easyPaiseName: easyPaiseName.trim() || null,
            easyPaiseNumber: easyPaiseNumber.trim() || null,
          }),
          updateGoal({ goalAmount, goalLabelEn, goalLabelUr, goalDeadline: goalDeadline || null }),
        ]);
        toast.success('Configuration saved ✓');
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
    });
  }

  return (
    <form onSubmit={save}>
      <div>
        <Field label={<>Vote threshold for case approval: <span className="text-[var(--color-gold)]">{thresh}%</span></>}>
          <input
            type="range"
            min={30}
            max={75}
            step={5}
            value={thresh}
            onChange={(e) => setThresh(parseInt(e.target.value))}
            className="slider-gold mt-2 w-full"
            style={{ '--fill': `${((thresh - 30) / 45) * 100}%` } as React.CSSProperties}
          />
        </Field>
        <div className="mt-1 text-[10px] italic text-[var(--color-gold-4)]">Higher = more consensus needed. 50% = simple majority.</div>
      </div>
      <Field className="mt-4 max-w-xs" label="Default monthly pledge (Rs.)">
        <Input type="number" value={defaultMonthly} onChange={(e) => setDefaultMonthly(parseInt(e.target.value) || 0)} />
      </Field>
      <div className="mt-5 border-t border-dashed border-[var(--border)] pt-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-gold-4)]">FAMILY GOAL</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Goal label (Urdu)"><Input value={goalLabelUr} onChange={(e) => setGoalLabelUr(e.target.value)} placeholder="مثلاً: عید الفطر تک" dir="rtl" /></Field>
          <Field label="Goal label (English)"><Input value={goalLabelEn} onChange={(e) => setGoalLabelEn(e.target.value)} placeholder="e.g. Eid-ul-Fitr Goal" /></Field>
          <Field label="Target amount (Rs.)"><Input type="number" value={goalAmount || ''} onChange={(e) => setGoalAmount(parseInt(e.target.value) || 0)} placeholder="0 = no goal" /></Field>
          <Field label="Deadline"><Input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} /></Field>
        </div>
      </div>
      <div className="mt-5 border-t border-dashed border-[var(--border)] pt-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-gold-4)]">FAUTI FUND · فوتی فنڈ</div>
        <p className="mb-3 text-[11px] text-[var(--txt-3)]">
          Kisi member ki wafat par unke ghar walon ko diya jane wala muqarrar payout. 0 = workflow band.
        </p>
        <Field className="max-w-xs" label="Payout amount (Rs.)">
          <Input type="number" value={fautiAmount || ''} onChange={(e) => setFautiAmount(parseInt(e.target.value) || 0)} placeholder="e.g. 50000" />
        </Field>
      </div>
      {/* EasyPaisa Collection Account */}
      <div className="mt-5 border-t border-dashed border-[var(--border)] pt-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--color-gold-4)]">EASYPAISE COLLECTION ACCOUNT</div>
        <p className="mb-3 text-[11px] text-[var(--txt-3)]">
          Supervisor ka personal EasyPaisa number yahan set karo. Members ko payment karte waqt yeh details dikhengi taaki woh seedha bhej sakein phir receipt upload karein.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Account Holder Name">
            <Input value={easyPaiseName} onChange={(e) => setEasyPaiseName(e.target.value)} placeholder="e.g. Muhammad Ali" />
          </Field>
          <Field label="EasyPaisa Number">
            <Input value={easyPaiseNumber} onChange={(e) => setEasyPaiseNumber(e.target.value)} placeholder="e.g. 0300-1234567" type="tel" />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t border-[var(--border)] pt-4">
        <Button type="submit" variant="gold" disabled={pending}>{pending ? 'Saving…' : 'Save Configuration'}</Button>
      </div>
    </form>
  );
}

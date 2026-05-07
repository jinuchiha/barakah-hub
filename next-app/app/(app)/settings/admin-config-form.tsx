'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateAdminConfig, updateGoal } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
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

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await updateAdminConfig({ voteThresholdPct: thresh, defaultMonthlyPledge: defaultMonthly });
        await updateGoal({ goalAmount, goalLabelEn, goalLabelUr, goalDeadline: goalDeadline || null });
        toast.success('Configuration saved ✓');
      } catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <form onSubmit={save}>
      <div>
        <Label>Vote threshold for case approval: <span className="text-[var(--color-gold)]">{thresh}%</span></Label>
        <input type="range" min={30} max={75} step={5} value={thresh} onChange={(e) => setThresh(parseInt(e.target.value))} className="w-full accent-[var(--color-gold-2)]" />
        <div className="mt-1 text-[10px] italic text-[var(--color-gold-4)]">Higher = more consensus needed. 50% = simple majority.</div>
      </div>
      <div className="mt-3">
        <Label>Default monthly pledge (Rs.)</Label>
        <Input type="number" value={defaultMonthly} onChange={(e) => setDefaultMonthly(parseInt(e.target.value) || 0)} />
      </div>
      <div className="mt-5 border-t border-dashed border-[var(--border)] pt-4">
        <div className="mb-2 font-[var(--font-display)] text-[10px] uppercase tracking-[2px] text-[var(--color-gold-4)]">🎯 FAMILY GOAL</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Goal label (Urdu)</Label><Input value={goalLabelUr} onChange={(e) => setGoalLabelUr(e.target.value)} placeholder="مثلاً: عید الفطر تک" dir="rtl" /></div>
          <div><Label>Goal label (English)</Label><Input value={goalLabelEn} onChange={(e) => setGoalLabelEn(e.target.value)} placeholder="e.g. Eid-ul-Fitr Goal" /></div>
          <div><Label>Target amount (Rs.)</Label><Input type="number" value={goalAmount || ''} onChange={(e) => setGoalAmount(parseInt(e.target.value) || 0)} placeholder="0 = no goal" /></div>
          <div><Label>Deadline</Label><Input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} /></div>
        </div>
      </div>
      <Button type="submit" variant="gold" className="mt-4" disabled={pending}>{pending ? 'Saving…' : 'Save Configuration'}</Button>
    </form>
  );
}

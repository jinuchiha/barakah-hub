'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createCase } from '@/app/actions';
import { t as tr } from '@/lib/i18n/dict';
import { useLocale } from '@/lib/i18n/use-locale';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Simplified case-creation form.
 *
 * One free-text "Reason" field — the user types in whatever language is
 * natural (Urdu, English, mixed) and the server fans it into both legacy
 * columns. No category dropdown — server defaults to "general" and admin
 * can recategorise during review if needed.
 */
export default function NewCaseForm() {
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    caseType: 'gift' as 'gift' | 'qarz',
    pool: 'sadaqah' as 'sadaqah' | 'zakat' | 'qarz',
    beneficiaryName: '',
    relation: '',
    city: '',
    amount: 0,
    reason: '',
    emergency: false,
    returnDate: '',
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm({ ...form, [k]: v }); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await createCase({ ...form, returnDate: form.returnDate || null });
        toast.success(tr('case.submitted', locale));
        setForm({ ...form, beneficiaryName: '', relation: '', city: '', amount: 0, reason: '', emergency: false, returnDate: '' });
        setOpen(false);
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Submission failed'); }
    });
  }

  if (!open) {
    return <Button variant="gold" size="sm" onClick={() => setOpen(true)}>{tr('case.newRequest', locale)}</Button>;
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <Label>{tr('case.type', locale)}</Label>
        <select className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]" value={form.caseType} onChange={(e) => set('caseType', e.target.value as 'gift' | 'qarz')}>
          <option value="gift">Gift / صدقہ</option>
          <option value="qarz">Qarz-e-Hasana</option>
        </select>
      </div>
      <div>
        <Label>{tr('case.pool', locale)}</Label>
        <select className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]" value={form.pool} onChange={(e) => set('pool', e.target.value as 'sadaqah' | 'zakat' | 'qarz')}>
          <option value="sadaqah">Sadaqah</option>
          <option value="zakat">Zakat</option>
          <option value="qarz">Qarz</option>
        </select>
      </div>
      {form.caseType === 'qarz' && (
        <div>
          <Label>{tr('case.returnDate', locale)}</Label>
          <Input type="date" value={form.returnDate} onChange={(e) => set('returnDate', e.target.value)} />
        </div>
      )}
      <div>
        <Label>{tr('case.beneficiary', locale)} *</Label>
        <Input value={form.beneficiaryName} onChange={(e) => set('beneficiaryName', e.target.value)} required />
      </div>
      <div>
        <Label>{tr('case.relation', locale)}</Label>
        <Input value={form.relation} onChange={(e) => set('relation', e.target.value)} placeholder={tr('case.relationPh', locale)} />
      </div>
      <div>
        <Label>{tr('case.city', locale)}</Label>
        <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
      </div>
      <div>
        <Label>{tr('case.amountNeeded', locale)} *</Label>
        <Input type="number" value={form.amount || ''} onChange={(e) => set('amount', parseInt(e.target.value) || 0)} required />
      </div>
      <div className="md:col-span-2">
        <Label>{tr('case.reason', locale)} *</Label>
        <textarea
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
          value={form.reason}
          onChange={(e) => set('reason', e.target.value)}
          rows={3}
          required
          placeholder={tr('case.reasonPh', locale)}
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={form.emergency} onChange={(e) => set('emergency', e.target.checked)} className="size-4 accent-red-500" />
        {tr('case.markUrgent', locale)}
      </label>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" variant="gold" disabled={pending || !form.beneficiaryName || !form.amount || form.reason.trim().length < 3}>
          {pending ? tr('case.submitting', locale) : tr('case.submitReq', locale)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tr('case.cancel', locale)}</Button>
      </div>
    </form>
  );
}

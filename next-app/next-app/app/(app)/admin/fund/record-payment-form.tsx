'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { recordPayment } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function RecordPaymentForm({ members }: { members: { id: string; nameEn: string }[] }) {
  const [pending, start] = useTransition();
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [pool, setPool] = useState<'sadaqah' | 'zakat' | 'qarz'>('sadaqah');
  const [month, setMonth] = useState(`${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [note, setNote] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId || !amount) { toast.error('Pick member and amount'); return; }
    start(async () => {
      try {
        await recordPayment({ memberId, amount, pool, monthLabel: month, note });
        toast.success(`Payment recorded`);
        setAmount(0); setNote('');
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    });
  }

  if (members.length === 0) {
    return <p className="text-sm italic text-[var(--txt-3)]">No approved members yet — approve a member first.</p>;
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-3">
        <Label>Member *</Label>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
          {members.map((m) => <option key={m.id} value={m.id}>{m.nameEn}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Amount *</Label><Input type="number" value={amount || ''} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} /></div>
        <div>
          <Label>Pool</Label>
          <select value={pool} onChange={(e) => setPool(e.target.value as any)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
            <option value="sadaqah">Sadaqah / صدقہ</option>
            <option value="zakat">Zakat / زکوٰۃ</option>
            <option value="qarz">Qarz pool</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>Month</Label>
          <Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="e.g. May 2026" />
        </div>
        <div className="md:col-span-2">
          <Label>Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. JazzCash transfer" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? 'Recording…' : 'Record Payment'}
        </Button>
        <span className="text-[11px] text-[var(--txt-3)]">
          Recorded payments enter the supervisor approval queue first.
        </span>
      </div>
    </form>
  );
}

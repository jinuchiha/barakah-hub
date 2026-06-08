'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { submitDonation } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DonationFormProps {
  easyPaiseName?: string | null;
  easyPaiseNumber?: string | null;
}

export default function DonationForm({ easyPaiseName, easyPaiseNumber }: DonationFormProps) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [pool, setPool] = useState<'sadaqah' | 'zakat'>('sadaqah');
  const [month, setMonth] = useState(`${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`);
  const [note, setNote] = useState('');

  function reset() {
    setAmount(0);
    setNote('');
    setMonth(`${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`);
    setPool('sadaqah');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error('Enter an amount');
      return;
    }
    start(async () => {
      try {
        await submitDonation({ amount, pool, monthLabel: month, note: note || undefined });
        toast.success('Submitted — admin will verify');
        reset();
        setOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Submission failed');
      }
    });
  }

  if (!open) {
    return (
      <Button variant="gold" size="sm" onClick={() => setOpen(true)}>
        + Submit Donation
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      {/* EasyPaisa Payment Instructions */}
      {easyPaiseNumber && (
        <div className="md:col-span-2 rounded-xl border border-[rgba(200,155,60,0.30)] bg-[rgba(200,155,60,0.08)] p-4">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--color-gold-4)]">
            📱 Send Payment Via EasyPaisa
          </div>
          <div className="text-sm font-semibold text-[var(--color-cream)]">
            {easyPaiseName && <span>{easyPaiseName} — </span>}
            <span className="font-mono text-[var(--color-gold)]">{easyPaiseNumber}</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--txt-3)]">
            Pehle EasyPaisa se yeh number pe paisa bhejein, phir receipt upload karke submit karein.
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="don-amount">Amount (Rs.) *</Label>
        <Input
          id="don-amount"
          type="number"
          min={1}
          value={amount || ''}
          onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
          required
        />
      </div>
      <div>
        <Label htmlFor="don-pool">Pool</Label>
        <select
          id="don-pool"
          value={pool}
          onChange={(e) => setPool(e.target.value as typeof pool)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
        >
          <option value="sadaqah">Sadaqah / صدقہ</option>
          <option value="zakat">Zakat / زکوٰۃ</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="don-month">Month</Label>
        <Input id="don-month" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="e.g. May 2026" />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="don-note">Note (optional)</Label>
        <Input id="don-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. JazzCash transfer ref #" />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit for verification'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => { reset(); setOpen(false); }}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

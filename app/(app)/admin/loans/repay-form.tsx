'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { recordRepayment } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  loanId: string;
  remaining: number;
}

export default function RepayForm({ loanId, remaining }: Props) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Enter an amount');
    if (amount > remaining) return toast.error(`Cannot exceed remaining ${remaining}`);
    start(async () => {
      try {
        await recordRepayment({ loanId, amount, note: note.trim() || undefined });
        toast.success('Repayment recorded');
        setAmount(0);
        setNote('');
        setOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>↩ Record repayment</Button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
      <div className="min-w-[120px] flex-1">
        <Input
          type="number"
          min={1}
          max={remaining}
          value={amount || ''}
          onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
          placeholder={`up to ${remaining}`}
          aria-label="Amount"
          required
        />
      </div>
      <div className="min-w-[160px] flex-1">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
      </div>
      <Button type="submit" variant="gold" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => { setAmount(0); setNote(''); setOpen(false); }}>
        Cancel
      </Button>
    </form>
  );
}

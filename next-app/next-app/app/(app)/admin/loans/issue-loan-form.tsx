'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { issueLoan } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  members: { id: string; name: string }[];
}

export default function IssueLoanForm({ members }: Props) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [purpose, setPurpose] = useState('');
  const [city, setCity] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');

  function reset() {
    setAmount(0);
    setPurpose('');
    setCity('');
    setExpectedReturn('');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) return toast.error('Pick a member');
    if (!amount || amount <= 0) return toast.error('Enter an amount');
    if (!purpose.trim()) return toast.error('Purpose required');
    start(async () => {
      try {
        await issueLoan({
          memberId,
          amount,
          purpose: purpose.trim(),
          city: city.trim() || undefined,
          expectedReturn: expectedReturn || null,
        });
        toast.success('Loan issued');
        reset();
        setOpen(false);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  if (!open) {
    return (
      <Button variant="gold" size="sm" onClick={() => setOpen(true)}>
        + Issue Qarz-e-Hasana
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Borrower *</Label>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]"
        >
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div>
        <Label>Amount (Rs.) *</Label>
        <Input type="number" min={1} value={amount || ''} onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)} required />
      </div>
      <div>
        <Label>Expected return</Label>
        <Input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label>Purpose *</Label>
        <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Hospital bill — son's surgery" required />
      </div>
      <div className="md:col-span-2">
        <Label>City</Label>
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? 'Issuing…' : 'Issue Loan'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
      </div>
    </form>
  );
}

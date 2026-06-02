'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createInvite } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CreateInviteForm() {
  const [pending, start] = useTransition();
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(14);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await createInvite({ label: label || undefined, maxUses, expiresInDays });
        toast.success('Invite created — copy the link below');
        setLabel('');
        setMaxUses(1);
        setExpiresInDays(14);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
      <div className="md:col-span-3">
        <Label>Label (optional)</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Khan family · Eid drive" maxLength={60} />
      </div>
      <div>
        <Label>Max uses</Label>
        <Input type="number" min={1} max={100} value={maxUses} onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 1)} />
      </div>
      <div>
        <Label>Expires in (days)</Label>
        <Input type="number" min={1} max={365} value={expiresInDays} onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10) || 14)} />
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="gold" className="w-full" disabled={pending}>
          {pending ? 'Creating…' : '➕ Generate Invite'}
        </Button>
      </div>
    </form>
  );
}

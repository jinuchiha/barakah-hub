'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { sendMessage } from '@/app/actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Recipient { id: string; nameEn: string; nameUr: string }

export default function MessageForm({ recipients }: { recipients: Recipient[] }) {
  const [pending, start] = useTransition();
  const [toId, setToId] = useState(recipients[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!toId) { toast.error('Pick a recipient'); return; }
    start(async () => {
      try {
        await sendMessage({ toId, subject, body });
        toast.success('Message sent');
        setSubject(''); setBody('');
      } catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-3">
        <Label>To (Admin)</Label>
        <select value={toId} onChange={(e) => setToId(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
          {recipients.map((r) => <option key={r.id} value={r.id}>{r.nameEn || r.nameUr}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <Label>Subject *</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
      </div>
      <div className="mb-3">
        <Label>Message *</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--color-gold)]"
        />
      </div>
      <Button type="submit" variant="gold" disabled={pending || !subject || !body}>
        {pending ? 'Sending…' : 'Send'}
      </Button>
    </form>
  );
}

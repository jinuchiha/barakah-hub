'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { broadcastNotification } from './actions';

export default function BroadcastForm({ memberCount }: { memberCount?: number }) {
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [type, setType] = useState<'info' | 'urgent' | 'payment'>('info');
  const [titleUr, setTitleUr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyUr, setBodyUr] = useState('');
  const [bodyEn, setBodyEn] = useState('');

  // Broadcasting is the highest-blast-radius action in the app (a push to
  // every member, irreversibly) — like every other irreversible action it
  // goes through ConfirmDialog, not a single click.
  function requestSend(e: React.FormEvent) {
    e.preventDefault();
    if (!titleEn || !bodyEn) { toast.error('English title + body required'); return; }
    setConfirmOpen(true);
  }

  function send() {
    start(async () => {
      try {
        await broadcastNotification({
          titleUr: titleUr || titleEn,
          titleEn,
          ur: bodyUr || bodyEn,
          en: bodyEn,
          type,
        });
        toast.success('Broadcast sent to all members');
        setTitleUr(''); setTitleEn(''); setBodyUr(''); setBodyEn('');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <form onSubmit={requestSend}>
      <Field className="mb-3" label="Type">
        <select value={type} onChange={(e) => setType(e.target.value as 'info' | 'urgent' | 'payment')} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
          <option value="info">Information</option>
          <option value="urgent">Urgent</option>
          <option value="payment">Payment Reminder</option>
        </select>
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title (Urdu)"><Input value={titleUr} onChange={(e) => setTitleUr(e.target.value)} dir="rtl" /></Field>
        <Field label="Title (English)"><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required /></Field>
        <Field className="md:col-span-2" label="Body (Urdu)">
          <textarea value={bodyUr} onChange={(e) => setBodyUr(e.target.value)} dir="rtl" rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3 text-sm font-[var(--font-arabic)] text-[var(--color-cream)] outline-none" />
        </Field>
        <Field className="md:col-span-2" label="Body (English) *">
          <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} required rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3 text-sm text-[var(--color-cream)] outline-none" />
        </Field>
      </div>
      <Button type="submit" variant="gold" className="mt-4" disabled={pending}>
        {pending ? 'Sending…' : 'Broadcast to all'}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send this broadcast?"
        description={`“${titleEn}” will be sent as an in-app notification and push to ${memberCount ? `all ${memberCount}` : 'ALL'} members immediately. This cannot be recalled.`}
        confirmLabel="Send to everyone"
        onConfirm={send}
      />
    </form>
  );
}

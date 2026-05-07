'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { broadcastNotification } from './actions';

export default function BroadcastForm() {
  const [pending, start] = useTransition();
  const [type, setType] = useState<'info' | 'urgent' | 'payment'>('info');
  const [titleUr, setTitleUr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyUr, setBodyUr] = useState('');
  const [bodyEn, setBodyEn] = useState('');

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!titleEn || !bodyEn) { toast.error('English title + body required'); return; }
    start(async () => {
      try {
        await broadcastNotification({
          ur: bodyUr || bodyEn,
          en: bodyEn,
          type,
        });
        toast.success('Broadcast sent to all members');
        setTitleUr(''); setTitleEn(''); setBodyUr(''); setBodyEn('');
      } catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <form onSubmit={send}>
      <div className="mb-3">
        <Label>Type</Label>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2.5 text-sm text-[var(--color-cream)]">
          <option value="info">📋 Information</option>
          <option value="urgent">🚨 Urgent</option>
          <option value="payment">💰 Payment Reminder</option>
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Title (Urdu)</Label><Input value={titleUr} onChange={(e) => setTitleUr(e.target.value)} dir="rtl" /></div>
        <div><Label>Title (English)</Label><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required /></div>
        <div className="md:col-span-2">
          <Label>Body (Urdu)</Label>
          <textarea value={bodyUr} onChange={(e) => setBodyUr(e.target.value)} dir="rtl" rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3 text-sm font-[var(--font-arabic)] text-[var(--color-cream)] outline-none" />
        </div>
        <div className="md:col-span-2">
          <Label>Body (English) *</Label>
          <textarea value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} required rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3 text-sm text-[var(--color-cream)] outline-none" />
        </div>
      </div>
      <Button type="submit" variant="gold" className="mt-4" disabled={pending}>
        {pending ? 'Sending…' : '📢 Broadcast to all'}
      </Button>
    </form>
  );
}

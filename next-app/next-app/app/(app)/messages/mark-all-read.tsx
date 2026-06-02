'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { markAllMessagesRead } from '@/app/actions';

export default function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await markAllMessagesRead();
            toast.success('All messages marked as read');
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed');
          }
        })
      }
      className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-gold-4)] hover:bg-[var(--surf-3)] disabled:opacity-50"
    >
      {pending ? 'Marking…' : 'Mark all read'}
    </button>
  );
}

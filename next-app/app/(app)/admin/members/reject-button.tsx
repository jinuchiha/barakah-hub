'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { rejectMember } from '@/app/actions';

export default function RejectButton({ memberId, name }: { memberId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Reject ${name}? They will receive an in-app notification.`)) return;
        start(async () => {
          try {
            await rejectMember(memberId);
            toast.success('Rejected');
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed');
          }
        });
      }}
      className="rounded-md bg-[rgba(220,50,47,0.08)] px-3 py-1 text-xs font-bold text-[var(--color-ruby-2)] disabled:opacity-50 hover:bg-[rgba(220,50,47,0.15)]"
    >
      {pending ? 'Rejecting…' : '✕ Reject'}
    </button>
  );
}

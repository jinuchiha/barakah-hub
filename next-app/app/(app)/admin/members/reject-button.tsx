'use client';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { rejectMember } from '@/app/actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function RejectButton({ memberId, name }: { memberId: string; name: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [rejected, setRejected] = useState(false);

  function doReject() {
    setRejected(true);
    start(async () => {
      try {
        await rejectMember(memberId);
        toast.success('Rejected');
      } catch (e: unknown) {
        setRejected(false);
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending || rejected}
        onClick={() => setOpen(true)}
        className={`rounded-md bg-[rgba(220,50,47,0.08)] px-3 py-1 text-xs font-bold text-[var(--color-ruby-2)] transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50 hover:bg-[rgba(220,50,47,0.15)] ${rejected ? 'scale-[0.98]' : ''}`}
      >
        {rejected ? '✓ Rejected' : '✕ Reject'}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reject Member"
        description={`Reject ${name}? They will receive an in-app notification.`}
        confirmLabel="Reject"
        destructive
        onConfirm={doReject}
      />
    </>
  );
}

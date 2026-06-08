'use client';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { rejectMember } from '@/app/actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function RejectButton({ memberId, name }: { memberId: string; name: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function doReject() {
    start(async () => {
      try {
        await rejectMember(memberId);
        toast.success('Rejected');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="rounded-md bg-[rgba(220,50,47,0.08)] px-3 py-1 text-xs font-bold text-[var(--color-ruby-2)] disabled:opacity-50 hover:bg-[rgba(220,50,47,0.15)]"
      >
        {pending ? 'Rejecting…' : '✕ Reject'}
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

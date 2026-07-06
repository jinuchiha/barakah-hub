'use client';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import {
  verifyPayment,
  supervisorApprovePayment,
  supervisorRejectPayment,
  adminResendPaymentToSupervisor,
  adminDeletePayment,
} from '@/app/actions';
import { ConfirmDialog, PromptDialog } from '@/components/ui/confirm-dialog';

/**
 * Action buttons on payment rows. Four modes match the 3 queue states
 * plus admin delete (which is universal):
 *
 *  - `supervisor-pending`: shown on supervisor view of awaiting payments.
 *    Approve (✓) or Reject (✗ with prompt for note).
 *  - `admin-pending`: admin view of payments still awaiting the
 *    supervisor's first decision. Admin can Delete only — verification
 *    has to come from the supervisor (who has the cash).
 *  - `admin-approved`: supervisor approved, awaiting admin's final.
 *    Verify (✓) or Delete (🗑).
 *  - `admin-rejected`: supervisor rejected. Resend to supervisor (↩)
 *    or Delete (🗑). Admin cannot force-verify per business rule.
 */
type Mode = 'supervisor-pending' | 'admin-pending' | 'admin-approved' | 'admin-rejected' | 'admin-history';

type DialogState =
  | { kind: 'none' }
  | { kind: 'reject-prompt' }
  | { kind: 'resend-confirm' }
  | { kind: 'delete-confirm' };

export default function VerifyButtons({
  paymentId,
  mode,
}: {
  paymentId: string;
  mode: Mode;
}) {
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });

  function call(fn: () => Promise<unknown>, successMsg: string) {
    start(async () => {
      try { await fn(); toast.success(successMsg); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
    });
  }

  if (mode === 'supervisor-pending') {
    return (
      <>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => call(() => supervisorApprovePayment(paymentId), 'Approved · pending admin final')}
            disabled={pending}
            className="rounded-md bg-[rgba(45,138,95,0.15)] px-3 py-1.5 text-xs font-bold text-[#4ec38d] disabled:opacity-50 hover:bg-[rgba(45,138,95,0.25)]"
          >
            ✓ Approve
          </button>
          <button
            type="button"
            onClick={() => setDialog({ kind: 'reject-prompt' })}
            disabled={pending}
            className="rounded-md bg-[rgba(220,82,82,0.10)] px-3 py-1.5 text-xs font-bold text-[#f08585] disabled:opacity-50 hover:bg-[rgba(220,82,82,0.20)]"
          >
            ✗ Reject
          </button>
        </div>
        <PromptDialog
          open={dialog.kind === 'reject-prompt'}
          onOpenChange={(o) => { if (!o) setDialog({ kind: 'none' }); }}
          title="Reject Payment"
          description="Provide a reason for rejection (optional)."
          placeholder="e.g. Receipt unclear, amount mismatch…"
          confirmLabel="Reject"
          onConfirm={(note) => call(
            () => supervisorRejectPayment(paymentId, note || undefined),
            'Rejected',
          )}
        />
      </>
    );
  }

  if (mode === 'admin-approved') {
    return (
      <>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => call(() => verifyPayment(paymentId), 'Verified ✓')} disabled={pending} className="rounded-md bg-[rgba(45,138,95,0.15)] px-3 py-1 text-xs font-bold text-[#4ec38d] disabled:opacity-50 hover:bg-[rgba(45,138,95,0.25)]">
            ✓ Verify
          </button>
          <button type="button" onClick={() => setDialog({ kind: 'delete-confirm' })} disabled={pending} className="rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-xs text-[var(--txt-3)] hover:border-[#dc5252]/40 hover:bg-red-500/10 hover:text-[#f08585] disabled:opacity-50">
            Delete
          </button>
        </div>
        <DeleteConfirm open={dialog.kind === 'delete-confirm'} onClose={() => setDialog({ kind: 'none' })} onConfirm={() => call(() => adminDeletePayment(paymentId), 'Deleted')} />
      </>
    );
  }

  if (mode === 'admin-rejected') {
    return (
      <>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setDialog({ kind: 'resend-confirm' })} disabled={pending} className="rounded-md bg-[rgba(96,141,215,0.15)] px-3 py-1 text-xs font-bold text-[#92b3df] disabled:opacity-50 hover:bg-[rgba(96,141,215,0.25)]">
            ↩ Resend
          </button>
          <button type="button" onClick={() => setDialog({ kind: 'delete-confirm' })} disabled={pending} className="rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-xs text-[var(--txt-3)] hover:border-[#dc5252]/40 hover:bg-red-500/10 hover:text-[#f08585] disabled:opacity-50">
            Delete
          </button>
        </div>
        <ConfirmDialog
          open={dialog.kind === 'resend-confirm'}
          onOpenChange={(o) => { if (!o) setDialog({ kind: 'none' }); }}
          title="Resend to Supervisor"
          description="Send this payment back to supervisor for re-approval?"
          confirmLabel="Resend"
          onConfirm={() => call(() => adminResendPaymentToSupervisor(paymentId), 'Sent back to supervisor')}
        />
        <DeleteConfirm open={dialog.kind === 'delete-confirm'} onClose={() => setDialog({ kind: 'none' })} onConfirm={() => call(() => adminDeletePayment(paymentId), 'Deleted')} />
      </>
    );
  }

  if (mode === 'admin-history') {
    return (
      <>
        <button type="button" onClick={() => setDialog({ kind: 'delete-confirm' })} disabled={pending} title="Delete verified payment" className="rounded-md border border-[var(--border-2)] bg-transparent px-2 py-1 text-[11px] text-[var(--txt-4)] hover:border-[#dc5252]/40 hover:bg-red-500/10 hover:text-[#f08585] disabled:opacity-50">
          ✕
        </button>
        <DeleteConfirm open={dialog.kind === 'delete-confirm'} onClose={() => setDialog({ kind: 'none' })} onConfirm={() => call(() => adminDeletePayment(paymentId), 'Deleted')} />
      </>
    );
  }

  // admin-pending: still awaiting supervisor's first look — admin can only delete
  return (
    <>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setDialog({ kind: 'delete-confirm' })} disabled={pending} className="rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-xs text-[var(--txt-3)] hover:border-[#dc5252]/40 hover:bg-red-500/10 hover:text-[#f08585] disabled:opacity-50">
          Delete
        </button>
      </div>
      <DeleteConfirm open={dialog.kind === 'delete-confirm'} onClose={() => setDialog({ kind: 'none' })} onConfirm={() => call(() => adminDeletePayment(paymentId), 'Deleted')} />
    </>
  );
}

function DeleteConfirm({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Delete Payment"
      description="Permanently delete this payment? This cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={onConfirm}
    />
  );
}

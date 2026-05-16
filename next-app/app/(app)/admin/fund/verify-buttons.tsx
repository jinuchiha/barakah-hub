'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import {
  verifyPayment,
  supervisorApprovePayment,
  supervisorRejectPayment,
  adminResendPaymentToSupervisor,
  adminDeletePayment,
} from '@/app/actions';

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
type Mode = 'supervisor-pending' | 'admin-pending' | 'admin-approved' | 'admin-rejected';

export default function VerifyButtons({
  paymentId,
  mode,
}: {
  paymentId: string;
  mode: Mode;
}) {
  const [pending, start] = useTransition();

  function call(fn: () => Promise<unknown>, successMsg: string) {
    start(async () => {
      try { await fn(); toast.success(successMsg); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
    });
  }

  function onSupervisorApprove() {
    call(() => supervisorApprovePayment(paymentId), 'Approved — pending admin final');
  }

  function onSupervisorReject() {
    const note = window.prompt('Reason for rejecting? (optional)') ?? undefined;
    if (note === null) return;       // user cancelled the prompt
    call(() => supervisorRejectPayment(paymentId, note), 'Rejected');
  }

  function onAdminVerify() {
    call(() => verifyPayment(paymentId), 'Verified ✓');
  }

  function onAdminResend() {
    if (!window.confirm('Send this payment back to supervisor for re-approval?')) return;
    call(() => adminResendPaymentToSupervisor(paymentId), 'Sent back to supervisor');
  }

  function onAdminDelete() {
    if (!window.confirm('Permanently delete this payment? This cannot be undone.')) return;
    call(() => adminDeletePayment(paymentId), 'Deleted');
  }

  if (mode === 'supervisor-pending') {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={onSupervisorApprove}
          disabled={pending}
          className="rounded-md bg-[rgba(45,138,95,0.15)] px-3 py-1.5 text-xs font-bold text-[#4ec38d] disabled:opacity-50 hover:bg-[rgba(45,138,95,0.25)]"
        >
          ✓ Approve
        </button>
        <button
          onClick={onSupervisorReject}
          disabled={pending}
          className="rounded-md bg-[rgba(220,82,82,0.10)] px-3 py-1.5 text-xs font-bold text-[#f08585] disabled:opacity-50 hover:bg-[rgba(220,82,82,0.20)]"
        >
          ✗ Reject
        </button>
      </div>
    );
  }

  if (mode === 'admin-approved') {
    return (
      <div className="flex gap-1.5">
        <button onClick={onAdminVerify} disabled={pending} className="rounded-md bg-[rgba(45,138,95,0.15)] px-3 py-1 text-xs font-bold text-[#4ec38d] disabled:opacity-50 hover:bg-[rgba(45,138,95,0.25)]">
          ✓ Verify
        </button>
        <button onClick={onAdminDelete} disabled={pending} className="rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-xs text-[var(--txt-3)] hover:border-[#dc5252]/40 hover:bg-red-500/10 hover:text-[#f08585] disabled:opacity-50">
          🗑 Delete
        </button>
      </div>
    );
  }

  if (mode === 'admin-rejected') {
    return (
      <div className="flex gap-1.5">
        <button onClick={onAdminResend} disabled={pending} className="rounded-md bg-[rgba(96,141,215,0.15)] px-3 py-1 text-xs font-bold text-[#92b3df] disabled:opacity-50 hover:bg-[rgba(96,141,215,0.25)]">
          ↩ Resend
        </button>
        <button onClick={onAdminDelete} disabled={pending} className="rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-xs text-[var(--txt-3)] hover:border-[#dc5252]/40 hover:bg-red-500/10 hover:text-[#f08585] disabled:opacity-50">
          🗑 Delete
        </button>
      </div>
    );
  }

  // admin-pending: still awaiting supervisor's first look — admin can only delete
  return (
    <div className="flex gap-1.5">
      <button onClick={onAdminDelete} disabled={pending} className="rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-xs text-[var(--txt-3)] hover:border-[#dc5252]/40 hover:bg-red-500/10 hover:text-[#f08585] disabled:opacity-50">
        🗑 Delete
      </button>
    </div>
  );
}

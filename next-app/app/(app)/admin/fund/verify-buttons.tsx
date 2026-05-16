'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { verifyPayment, rejectPayment, supervisorApprovePayment } from '@/app/actions';

/**
 * Two modes:
 *  - `supervisor` — shows a single "Approve" button that calls
 *    supervisorApprovePayment. Marks the payment as supervisor-approved
 *    (intermediate state) without finalising it. Used on the supervisor
 *    view of /admin/fund.
 *  - `admin` — shows "Verify" (final) and "Reject" buttons. Used on the
 *    admin view of /admin/fund, on both supervisor-approved and raw
 *    pending payments (admin can verify directly if needed).
 */
export default function VerifyButtons({
  paymentId,
  mode = 'admin',
}: {
  paymentId: string;
  mode?: 'supervisor' | 'admin';
}) {
  const [pending, start] = useTransition();

  function adminAct(verify: boolean) {
    start(async () => {
      try {
        if (verify) { await verifyPayment(paymentId); toast.success('Verified ✓'); }
        else { await rejectPayment(paymentId); toast('Rejected'); }
      } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Action failed'); }
    });
  }

  function supervisorAct() {
    start(async () => {
      try {
        await supervisorApprovePayment(paymentId);
        toast.success('Approved — pending admin final');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Action failed');
      }
    });
  }

  if (mode === 'supervisor') {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={supervisorAct}
          disabled={pending}
          className="rounded-md bg-[rgba(45,138,95,0.15)] px-3 py-1.5 text-xs font-bold text-[#4ec38d] disabled:opacity-50 hover:bg-[rgba(45,138,95,0.25)]"
        >
          ✓ Approve
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <button onClick={() => adminAct(true)} disabled={pending} className="rounded-md bg-[rgba(30,42,74,0.15)] px-3 py-1 text-xs font-bold text-[var(--color-emerald-2)] disabled:opacity-50 hover:bg-[rgba(30,42,74,0.25)]">✓ Verify</button>
      <button onClick={() => adminAct(false)} disabled={pending} className="rounded-md bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 disabled:opacity-50 hover:bg-red-500/20">✗ Reject</button>
    </div>
  );
}

'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { adminResolveCase, adminDeleteCase } from '@/app/actions';

/**
 * Admin power-bar shown on every voting / approved / rejected case.
 *
 *  - "Force Approve" / "Force Reject" override the community vote.
 *  - "Delete" removes the case (and cascades votes); blocked when a
 *    disbursed case has a linked loan.
 *
 * Each action is gated by a quick confirm — destructive enough to
 * warrant a second tap, light enough not to be annoying for admin work.
 */
export function AdminCaseActions({
  caseId,
  status,
  beneficiary,
}: {
  caseId: string;
  status: 'voting' | 'approved' | 'rejected' | 'disbursed';
  beneficiary: string;
}) {
  const [pending, start] = useTransition();

  function resolve(decision: 'approved' | 'rejected') {
    if (!window.confirm(`Force-${decision === 'approved' ? 'approve' : 'reject'} request for ${beneficiary}?`)) return;
    start(async () => {
      try {
        await adminResolveCase(caseId, decision);
        toast.success(decision === 'approved' ? 'Approved by admin' : 'Rejected by admin');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Action failed');
      }
    });
  }

  function remove() {
    if (!window.confirm(`DELETE case for ${beneficiary}? This cannot be undone.`)) return;
    start(async () => {
      try {
        await adminDeleteCase(caseId);
        toast.success('Case deleted');
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
      <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--txt-3)]">
        Admin
      </span>
      {status === 'voting' && (
        <>
          <button
            type="button"
            onClick={() => resolve('approved')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2d8a5f]/40 bg-[#2d8a5f]/10 px-2.5 py-1 text-[11px] font-semibold text-[#4ec38d] transition-colors hover:bg-[#2d8a5f]/20 disabled:opacity-50"
          >
            <CheckCircle2 className="size-3.5" />
            Force Approve
          </button>
          <button
            type="button"
            onClick={() => resolve('rejected')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#dc5252]/40 bg-[#dc5252]/10 px-2.5 py-1 text-[11px] font-semibold text-[#f08585] transition-colors hover:bg-[#dc5252]/20 disabled:opacity-50"
          >
            <XCircle className="size-3.5" />
            Force Reject
          </button>
        </>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-[11px] font-semibold text-[var(--txt-3)] transition-colors hover:border-[#dc5252]/40 hover:bg-[#dc5252]/10 hover:text-[#f08585] disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
        Delete
      </button>
    </div>
  );
}

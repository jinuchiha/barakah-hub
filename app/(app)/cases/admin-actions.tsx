'use client';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { adminResolveCase, adminDeleteCase } from '@/app/actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Admin power-bar shown on every voting / approved / rejected case.
 *
 *  - "Force Approve" / "Force Reject" override the community vote.
 *  - "Delete" removes the case (and cascades votes); blocked when a
 *    disbursed case has a linked loan.
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
  const [dialog, setDialog] = useState<'none' | 'approve' | 'reject' | 'delete'>('none');

  function resolve(decision: 'approved' | 'rejected') {
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
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--txt-3)]">
          Admin
        </span>
        {status === 'voting' && (
          <>
            <button
              type="button"
              onClick={() => setDialog('approve')}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2d8a5f]/40 bg-[#2d8a5f]/10 px-2.5 py-1 text-[11px] font-semibold text-[#4ec38d] transition-colors hover:bg-[#2d8a5f]/20 disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" />
              Force Approve
            </button>
            <button
              type="button"
              onClick={() => setDialog('reject')}
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
          onClick={() => setDialog('delete')}
          disabled={pending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[var(--border-2)] bg-transparent px-2.5 py-1 text-[11px] font-semibold text-[var(--txt-3)] transition-colors hover:border-[#dc5252]/40 hover:bg-[#dc5252]/10 hover:text-[#f08585] disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => { if (!o) setDialog('none'); }}
        title="Force Approve"
        description={`Override community vote and approve the request for ${beneficiary}?`}
        confirmLabel="Force Approve"
        onConfirm={() => resolve('approved')}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => { if (!o) setDialog('none'); }}
        title="Force Reject"
        description={`Override community vote and reject the request for ${beneficiary}?`}
        confirmLabel="Force Reject"
        destructive
        onConfirm={() => resolve('rejected')}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => { if (!o) setDialog('none'); }}
        title="Delete Case"
        description={`Delete the case for ${beneficiary}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}

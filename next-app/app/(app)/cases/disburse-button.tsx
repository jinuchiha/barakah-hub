'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { disburseCase } from '@/app/actions';

export default function DisburseButton({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition();
  function handle() {
    start(async () => {
      try { await disburseCase(caseId); toast.success('Disbursed — funds marked as distributed'); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    });
  }
  return (
    <button
      onClick={handle}
      disabled={pending}
      className="rounded-md border border-[var(--color-emerald-2)]/40 bg-[var(--color-emerald-2)]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-emerald-2)] disabled:opacity-50 hover:bg-[var(--color-emerald-2)]/20"
    >
      {pending ? '…' : '✓ Mark Disbursed'}
    </button>
  );
}

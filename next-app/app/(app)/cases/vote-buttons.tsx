'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { castVote } from '@/app/actions';

export default function VoteButtons({ caseId, alreadyVoted }: { caseId: string; alreadyVoted: boolean }) {
  const [pending, start] = useTransition();
  function vote(yes: boolean) {
    start(async () => {
      try { await castVote(caseId, yes); toast.success(yes ? '✓ Vote recorded — جزاکم اللہ' : '✗ No vote recorded'); }
      catch (e: any) { toast.error(e.message || 'Vote failed'); }
    });
  }
  if (alreadyVoted) return <div className="text-xs italic text-[var(--color-emerald-2)]">✓ You have voted</div>;
  return (
    <div className="flex gap-2">
      <button onClick={() => vote(true)} disabled={pending} className="rounded-md border border-[rgba(31,110,74,0.4)] bg-[rgba(31,110,74,0.15)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-emerald-2)] disabled:opacity-50 hover:bg-[rgba(31,110,74,0.25)]">
        ✓ Yes — حق
      </button>
      <button onClick={() => vote(false)} disabled={pending} className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 disabled:opacity-50 hover:bg-red-500/20">
        ✗ No — مخالف
      </button>
    </div>
  );
}

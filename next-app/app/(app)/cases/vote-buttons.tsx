'use client';
import { useLocale } from '@/lib/i18n/use-locale';
import { t as tr } from '@/lib/i18n/dict';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { castVote } from '@/app/actions';

export default function VoteButtons({ caseId, alreadyVoted }: { caseId: string; alreadyVoted: boolean }) {
  const [pending, start] = useTransition();
  const locale = useLocale();
  function vote(yes: boolean) {
    start(async () => {
      try { await castVote(caseId, yes); toast.success(yes ? tr('toast.voteRecorded', locale) : '✗ No vote recorded'); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Vote failed'); }
    });
  }
  if (alreadyVoted) return <div className="text-xs italic text-[var(--color-emerald-2)]">✓ {tr('case.voted', locale)}</div>;
  return (
    <div className="flex gap-2">
      <button onClick={() => vote(true)} disabled={pending} className="rounded-md border border-[rgba(30,42,74,0.4)] bg-[rgba(30,42,74,0.15)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-emerald-2)] disabled:opacity-50 hover:bg-[rgba(30,42,74,0.25)]">
        {tr('case.voteYes', locale)} · حق
      </button>
      <button onClick={() => vote(false)} disabled={pending} className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 disabled:opacity-50 hover:bg-red-500/20">
        {tr('case.voteNo', locale)} · مخالف
      </button>
    </div>
  );
}

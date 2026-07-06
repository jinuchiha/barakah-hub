'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { approveMember } from '@/app/actions';
import { useLocale } from '@/lib/i18n/use-locale';
import { t as tr } from '@/lib/i18n/dict';

export default function ApproveButton({ memberId }: { memberId: string }) {
  const [pending, start] = useTransition();
  const locale = useLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await approveMember(memberId);
            toast.success('Approved');
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed');
          }
        })
      }
      className="rounded-md bg-[rgba(30,42,74,0.15)] px-3 py-1 text-xs font-bold text-[var(--color-emerald-2)] disabled:opacity-50 hover:bg-[rgba(30,42,74,0.25)]"
    >
      {pending ? '…' : `✓ ${tr('mem.approve', locale)}`}
    </button>
  );
}

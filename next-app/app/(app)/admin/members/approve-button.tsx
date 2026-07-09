'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { approveMember } from '@/app/actions';
import { useLocale } from '@/lib/i18n/use-locale';
import { t as tr } from '@/lib/i18n/dict';

export default function ApproveButton({ memberId }: { memberId: string }) {
  const [pending, start] = useTransition();
  const [approved, setApproved] = useState(false);
  const locale = useLocale();
  return (
    <button
      type="button"
      disabled={pending || approved}
      onClick={() => {
        setApproved(true);
        start(async () => {
          try {
            await approveMember(memberId);
            toast.success('Approved');
          } catch (e: unknown) {
            setApproved(false);
            toast.error(e instanceof Error ? e.message : 'Failed');
          }
        });
      }}
      className={`rounded-md bg-[rgba(30,42,74,0.15)] px-3 py-1 text-xs font-bold text-[var(--color-emerald-2)] transition-transform duration-150 ease-out active:scale-[0.98] disabled:opacity-50 hover:bg-[rgba(30,42,74,0.25)] ${approved ? 'scale-[0.98]' : ''}`}
    >
      {approved ? '✓ Approved' : `✓ ${tr('mem.approve', locale)}`}
    </button>
  );
}

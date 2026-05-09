'use client';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { verifyPayment, rejectPayment } from '@/app/actions';

export default function VerifyButtons({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition();
  function act(verify: boolean) {
    start(async () => {
      try {
        if (verify) { await verifyPayment(paymentId); toast.success('Verified ✓'); }
        else { await rejectPayment(paymentId); toast('Rejected'); }
      } catch (e: any) { toast.error(e.message); }
    });
  }
  return (
    <div className="flex gap-1.5">
      <button onClick={() => act(true)} disabled={pending} className="rounded-md bg-[rgba(30,42,74,0.15)] px-3 py-1 text-xs font-bold text-[var(--color-emerald-2)] disabled:opacity-50 hover:bg-[rgba(30,42,74,0.25)]">✓ Verify</button>
      <button onClick={() => act(false)} disabled={pending} className="rounded-md bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 disabled:opacity-50 hover:bg-red-500/20">✗ Reject</button>
    </div>
  );
}

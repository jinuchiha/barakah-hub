'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { openFautiCase } from '@/app/actions';
import { Button } from '@/components/ui/button';

export default function FautiButton({ memberId }: { memberId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="gold"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await openFautiCase(memberId);
            toast.success('Fauti case opened · disburse it from Emergency Cases');
            router.refresh();
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed');
          }
        })
      }
    >
      {pending ? 'Opening…' : 'Open fauti payout'}
    </Button>
  );
}

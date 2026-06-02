'use client';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { markAllNotificationsRead } from '@/app/actions';
import { toast } from 'sonner';

export default function MarkAllReadButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await markAllNotificationsRead(); toast.success('All marked read'); })}
    >
      {pending ? '…' : '✓ Mark all read'}
    </Button>
  );
}

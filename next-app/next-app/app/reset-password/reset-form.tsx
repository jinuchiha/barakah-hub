'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    if (!token) return toast.error('Reset link is invalid or expired');

    start(async () => {
      const { error } = await authClient.resetPassword({ newPassword: password, token });
      if (error) { toast.error(error.message ?? 'Reset failed'); return; }
      toast.success('Password updated — sign in with your new password');
      setTimeout(() => router.push('/login'), 1500);
    });
  }

  return (
    <form onSubmit={submit}>
      <Label htmlFor="rp-password">New password *</Label>
      <Input
        id="rp-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
      <div className="mt-3" />
      <Label htmlFor="rp-confirm">Confirm new password *</Label>
      <Input
        id="rp-confirm"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
      <Button type="submit" variant="gold" className="mt-4 w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}

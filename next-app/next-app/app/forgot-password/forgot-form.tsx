'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotForm() {
  const [email, setEmail] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { toast.error(error.message ?? 'Reset failed'); return; }
      toast.success('Reset email sent — check your inbox');
      setTimeout(() => router.push('/login'), 1800);
    });
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-xs leading-relaxed text-[var(--txt-2)]">
        Enter the email tied to your account. We&apos;ll send a magic link to reset your password.
        If you can&apos;t access your email, contact the family admin directly.
      </p>
      <Label htmlFor="fp-email">Email *</Label>
      <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@family.com" />
      <Button type="submit" variant="gold" className="mt-3 w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send Reset Link'}
      </Button>
    </form>
  );
}

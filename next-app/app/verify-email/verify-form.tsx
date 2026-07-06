'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function VerifyForm({ email: initialEmail }: { email: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const { error } = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp: otp.trim() });
      if (error) {
        toast.error(error.message ?? 'Invalid or expired code');
        return;
      }
      toast.success('Email verified · تصدیق مکمل');
      router.push('/login');
    });
  }

  async function resend() {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: 'email-verification' });
    if (error) toast.error(error.message ?? 'Could not send code');
    else toast.success('New code sent · check your inbox');
  }

  return (
    <form onSubmit={submit} className="mt-6 text-left">
      {!initialEmail && (
        <div className="mb-4">
          <Label htmlFor="ve-email">Email</Label>
          <Input id="ve-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      )}
      <div className="mb-5">
        <Label htmlFor="ve-otp">6-digit code</Label>
        <Input
          id="ve-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
          className="tabular text-center text-2xl tracking-[10px]"
          placeholder="••••••"
        />
      </div>
      <Button type="submit" variant="gold" className="w-full" disabled={pending || otp.length !== 6}>
        {pending ? 'Verifying…' : 'Verify · تصدیق کریں'}
      </Button>
      <button
        type="button"
        onClick={resend}
        className="mt-4 w-full text-center text-xs text-[var(--color-gold)] underline-offset-2 hover:underline"
      >
        Resend code · دوبارہ کوڈ بھیجیں
      </button>
    </form>
  );
}

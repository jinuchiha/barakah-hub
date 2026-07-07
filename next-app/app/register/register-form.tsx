'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { toast } from 'sonner';
import { signUp } from '@/lib/auth-client';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    start(async () => {
      const { data, error } = await signUp.email({ email, password, name });
      if (error) { toast.error(error.message ?? 'Registration failed'); return; }
      // With email verification on, signUp returns no session — the user
      // confirms the emailed 6-digit code first, then signs in.
      if (!data?.token) {
        toast.success('Account created · check your email for the code');
        router.replace(`/verify-email?email=${encodeURIComponent(email)}` as Route);
        return;
      }
      toast.success('Account created · completing your profile next');
      router.replace('/onboarding');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-3">
        <Label htmlFor="reg-name">Full name *</Label>
        <Input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </div>
      <div className="mb-3">
        <Label htmlFor="reg-email">Email *</Label>
        <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="mb-3">
        <Label htmlFor="reg-password">Password *</Label>
        <Input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" variant="gold" className="mt-2 w-full" disabled={pending}>
        {pending ? 'Creating…' : 'Register'}
      </Button>
      <p className="mt-3 text-center text-[11px] text-[var(--txt-4)]">
        By registering you agree to the{' '}
        <a href="/terms" className="underline hover:text-[var(--color-gold)]">Terms</a>
        {' · '}
        <a href="/privacy" className="underline hover:text-[var(--color-gold)]">Privacy Policy</a>
      </p>
    </form>
  );
}

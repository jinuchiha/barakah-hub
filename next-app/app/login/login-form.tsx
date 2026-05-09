'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth-client';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await signIn.email({ email, password });
      if (error) {
        toast.error(error.message ?? 'Login failed');
        return;
      }
      toast.success('السلام علیکم — Welcome back');
      router.replace((next as any) || '/dashboard');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6">
      <div className="mb-4">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-required="true"
          placeholder="you@family.com"
        />
      </div>
      <div className="mb-4">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-required="true"
        />
      </div>
      <Button type="submit" variant="gold" className="w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Enter — داخل ہوں'}
      </Button>
      <div className="mt-4 flex flex-col items-center gap-2 text-xs">
        <a href="/forgot-password" className="text-[var(--color-gold)] underline-offset-2 hover:underline">
          Forgot password? — پاس ورڈ بھول گئے؟
        </a>
        <span className="text-[var(--color-gold-4)]">
          New here? <a href="/register" className="text-[var(--color-gold)] underline-offset-2 hover:underline">Create an account</a>
        </span>
      </div>
    </form>
  );
}

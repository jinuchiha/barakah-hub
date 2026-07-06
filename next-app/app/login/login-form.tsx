'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth-client';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Restrict the post-login redirect to same-origin absolute paths so
 * a crafted ?next=//evil.com URL can't redirect users off-site.
 * Must start with '/' but NOT '//' (protocol-relative URL).
 */
function safeNext(next?: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/dashboard';
  }
  return next;
}

/** Full-screen golden wipe played between successful sign-in and redirect. */
function WelcomeWipe({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[120] grid place-items-center backdrop-blur-md"
          style={{ background: 'rgba(6,11,19,0.45)' }}
        >
          {/* Space field stays visible through the veil; light blooms over it. */}
          <motion.div
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 26, opacity: 0 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
            className="absolute size-24 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(232,197,99,0.55), rgba(200,155,60,0.15) 60%, transparent 75%)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute size-[26rem] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(200,155,60,0.16), transparent 65%)' }}
          />
          <motion.p
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            dir="rtl"
            lang="ar"
            className="relative font-[var(--font-arabic)] text-3xl leading-[2] text-[var(--color-gold-2)]"
            style={{ textShadow: '0 0 30px rgba(200,155,60,0.55)' }}
          >
            السلام علیکم
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [welcome, setWelcome] = useState(false);
  const [pending, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await signIn.email({ email, password });
      if (error) {
        toast.error(error.message ?? 'Login failed');
        return;
      }
      const go = () => {
        router.replace(safeNext(next) as Route);
        router.refresh();
      };
      if (reduce) {
        go();
        return;
      }
      setWelcome(true);
      setTimeout(go, 950);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6">
      <WelcomeWipe show={welcome} />
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
      <motion.div whileTap={reduce ? undefined : { scale: 0.97 }}>
        <Button
          type="submit"
          variant="gold"
          className={`w-full ${pending ? 'btn-signing' : ''}`}
          disabled={pending || welcome}
        >
          {pending || welcome ? 'داخل ہو رہے ہیں…' : 'Enter · داخل ہوں'}
        </Button>
      </motion.div>
      <div className="mt-4 flex flex-col items-center gap-2 text-xs">
        <a href="/forgot-password" className="text-[var(--color-gold)] underline-offset-2 hover:underline">
          Forgot password? · پاس ورڈ بھول گئے؟
        </a>
        <span className="text-[var(--color-gold-4)]">
          New here? <a href="/register" className="text-[var(--color-gold)] underline-offset-2 hover:underline">Create an account</a>
        </span>
      </div>
    </form>
  );
}

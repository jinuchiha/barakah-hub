'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { adminVerifyEmailByAddress } from '@/app/actions';
import { t as tr } from '@/lib/i18n/dict';
import { useLocale } from '@/lib/i18n/use-locale';

/**
 * Escape hatch for stuck accounts: when the OTP email can't be delivered
 * (Resend sandbox only sends to the account owner until a domain is
 * verified), the admin confirms the person's identity offline and marks
 * their email verified here so they can sign in.
 */
export default function VerifyEmailTool() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-xs font-medium text-[var(--txt-2)] transition-colors hover:border-[var(--color-gold)]/30 hover:text-[var(--color-cream)]"
      >
        {tr('mem.verifyEmail', locale)}
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try {
            await adminVerifyEmailByAddress(email);
            toast.success(tr('mem.emailVerified', locale));
            setEmail('');
            setOpen(false);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed');
          }
        });
      }}
    >
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="member@email.com"
        className="w-52 rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-xs text-[var(--color-cream)] placeholder:text-[var(--txt-4)] focus:border-[var(--color-gold)]/50 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-[rgba(200,155,60,0.4)] bg-[rgba(200,155,60,0.12)] px-3 py-2 text-xs font-semibold text-[var(--color-gold-2)] transition-colors hover:bg-[rgba(200,155,60,0.2)] disabled:opacity-50"
      >
        {pending ? '…' : tr('mem.verifyEmail', locale)}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-2 py-2 text-xs text-[var(--txt-3)] hover:text-[var(--color-cream)]"
      >
        ✕
      </button>
    </form>
  );
}

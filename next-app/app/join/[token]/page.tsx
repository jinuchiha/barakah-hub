import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { memberInvites, members } from '@/lib/db/schema';

export const metadata = { title: 'Join Barakah Hub' };

interface Props { params: Promise<{ token: string }> }

export default async function JoinPage({ params }: Props) {
  const { token } = await params;
  const [invite] = await db.select().from(memberInvites).where(eq(memberInvites.token, token)).limit(1);

  const status = (() => {
    if (!invite) return { ok: false, message: 'This invite link is invalid or has been removed.' };
    if (invite.revoked) return { ok: false, message: 'This invite has been revoked. Ask the admin for a fresh one.' };
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return { ok: false, message: 'This invite has expired.' };
    if (invite.usedCount >= invite.maxUses) return { ok: false, message: 'This invite has reached its usage limit.' };
    return { ok: true, message: '' };
  })();

  const [inviter] = invite ? await db.select({ nameEn: members.nameEn, nameUr: members.nameUr }).from(members).where(eq(members.id, invite.createdById)).limit(1) : [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(214,210,199,0.04)] p-8 text-center shadow-xl">
        {status.ok ? (
          <>
            <div className="mb-4 text-4xl">🌙</div>
            <h1 className="mb-2 font-[var(--font-arabic)] text-2xl text-[var(--color-gold-2)]">السلام علیکم</h1>
            <p className="mb-1 font-[var(--font-display)] text-sm uppercase tracking-widest text-[var(--color-gold-4)]">You're invited to Barakah Hub</p>
            {invite?.label && (
              <p className="mt-3 text-sm text-[var(--txt-2)]">Invitation: <strong className="text-[var(--color-gold-2)]">{invite.label}</strong></p>
            )}
            {inviter && (
              <p className="mt-1 text-xs text-[var(--txt-3)]">From {inviter.nameEn || inviter.nameUr}</p>
            )}
            <p className="mt-4 text-sm text-[var(--txt-2)]">Create your account to join the family fund. After signup, an admin will review and approve you.</p>
            <Link
              href={`/register?invite=${invite.token}`}
              className="mt-6 inline-block rounded-full bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] px-8 py-3 text-sm font-bold uppercase tracking-wider text-[var(--color-ink)] shadow-lg"
            >
              Continue to Register
            </Link>
            <Link href="/login" className="mt-3 block text-xs text-[var(--color-gold-4)] underline-offset-2 hover:underline">
              Already have an account? Sign in
            </Link>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">⛔</div>
            <h1 className="mb-2 font-[var(--font-display)] text-xl text-[var(--color-gold-2)]">Invite unavailable</h1>
            <p className="mt-2 text-sm text-[var(--txt-2)]">{status.message}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--color-gold-4)] transition-colors hover:bg-[rgba(214,210,199,0.08)]"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, accounts } from '@/lib/db/schema';

/**
 * Admin password reset — bypasses email/Resend.
 *
 * Usage:
 *   tsx scripts/reset-password.ts <email-or-username> <new-password>
 *
 * Sets the credential-provider password hash directly using Better-Auth's
 * own hashing, so the new password works for login immediately.
 */
async function main() {
  const [identifier, newPassword] = process.argv.slice(2);
  if (!identifier || !newPassword) {
    console.error('Usage: tsx scripts/reset-password.ts <email-or-username> <new-password>');
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const user = (
    await db.select().from(users).where(eq(users.email, identifier)).limit(1)
  )[0];
  if (!user) {
    console.error(`No user found with email "${identifier}".`);
    process.exit(1);
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);

  const existing = (
    await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential')))
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(accounts)
      .set({ password: hash, updatedAt: new Date() })
      .where(eq(accounts.id, existing.id));
  } else {
    await db.insert(accounts).values({
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: hash,
    });
  }

  console.log(`✅ Password reset for ${user.email}. New password: ${newPassword}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

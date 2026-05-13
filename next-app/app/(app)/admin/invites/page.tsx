import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { memberInvites, members } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import CreateInviteForm from './create-invite-form';
import InviteRow from './invite-row';

export const metadata = { title: 'Member Invites · Barakah Hub' };

export default async function InvitesPage() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const invites = await db.select().from(memberInvites).orderBy(desc(memberInvites.createdAt)).limit(100);
  const creatorIds = [...new Set(invites.map((i) => i.createdById))];
  const creators = creatorIds.length
    ? await db.select({ id: members.id, nameEn: members.nameEn }).from(members).where(eq(members.id, creatorIds[0]))
    : [];
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://barakah-hub.vercel.app';

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">دعوت نامے</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Generate shareable invite links / QR codes for new members</p>
      </header>

      <Card className="mb-4">
        <CardHeader><CardTitle>+ Create New Invite</CardTitle></CardHeader>
        <CardBody><CreateInviteForm /></CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Invites</CardTitle>
          <span className="text-xs text-[var(--color-gold-4)]">{invites.length} total</span>
        </CardHeader>
        <CardBody className="p-0">
          {invites.length === 0 && (
            <div className="py-10 text-center italic text-[var(--txt-3)]">No invites yet — create one above to start onboarding members.</div>
          )}
          {invites.map((inv) => (
            <InviteRow
              key={inv.id}
              invite={{
                id: inv.id,
                token: inv.token,
                label: inv.label,
                maxUses: inv.maxUses,
                usedCount: inv.usedCount,
                expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
                revoked: inv.revoked,
                createdAt: inv.createdAt.toISOString(),
                createdBy: creatorMap.get(inv.createdById)?.nameEn ?? 'Admin',
              }}
              origin={origin}
            />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

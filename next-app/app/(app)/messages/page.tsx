import { eq, desc, asc } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, messages } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import MessageForm from './message-form';
import MarkAllRead from './mark-all-read';

export const metadata = { title: 'Messages · Barakah Hub' };

export default async function MessagesPage() {
  const me = await getMeOrRedirect();

  const [inbox, allMembers] = await Promise.all([
    db.select().from(messages).where(eq(messages.toId, me.id)).orderBy(desc(messages.createdAt)).limit(50),
    db
      .select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, role: members.role })
      .from(members)
      .where(eq(members.deceased, false))
      .orderBy(asc(members.nameEn)),
  ]);
  const recipients = allMembers.filter((m) => m.role === 'admin');
  const memById = new Map(allMembers.map((m) => [m.id, m]));
  const unread = inbox.filter((m) => !m.read).length;

  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>✉️ Send Message</CardTitle></CardHeader>
        <CardBody><MessageForm recipients={recipients} /></CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📥 Inbox ({unread} unread / {inbox.length})</CardTitle>
          {unread > 0 && <MarkAllRead />}
        </CardHeader>
        <CardBody className="p-0">
          {inbox.length === 0 && (
            <div className="py-12 text-center text-sm italic text-[var(--txt-3)]">Inbox empty</div>
          )}
          {inbox.map((m) => {
            const sender = memById.get(m.fromId);
            return (
              <div key={m.id} className={`border-b border-[rgba(201,168,76,0.06)] p-3 ${m.read ? '' : 'bg-[rgba(31,110,74,0.05)]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--color-cream)]">{sender?.nameEn || sender?.nameUr || '?'}</span>
                  <span className="text-[10px] text-[var(--color-gold-4)]">{new Date(m.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="text-sm text-[var(--color-gold)]">{m.subject}</div>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--txt-2)]">{m.body}</p>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

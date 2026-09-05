import { and, eq, desc, asc } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, messages } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import MessageForm from './message-form';
import MarkAllRead from './mark-all-read';
import { t } from '@/lib/i18n/dict';
import { fmtDate } from '@/lib/format';
import { getLocale } from '@/lib/i18n/server';

export const metadata = { title: 'Messages · Barakah Hub' };

/**
 * One message row. `<details>` lets the full body expand in place — the old
 * `line-clamp-2` preview had no detail view at all, so anything longer than
 * two lines was permanently unreadable in the product.
 */
function MessageItem({
  heading,
  date,
  subject,
  body,
  unread = false,
}: {
  heading: string;
  date: Date | string;
  subject: string;
  body: string;
  unread?: boolean;
}) {
  return (
    <details className={`group border-b border-[var(--border)] ${unread ? 'border-l-2 border-l-[rgba(200,155,60,0.55)] bg-[rgba(200,155,60,0.06)]' : ''}`}>
      <summary className="cursor-pointer list-none p-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-cream)]">{heading}</span>
          <span className="text-[10px] text-[var(--color-gold-4)]">{fmtDate(date)}</span>
        </div>
        <div className="text-sm text-[var(--color-gold)]">{subject}</div>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--txt-2)] group-open:hidden">{body}</p>
        <span className="mt-1 hidden text-[10px] text-[var(--txt-4)] group-open:inline">Tap to collapse</span>
      </summary>
      <p className="whitespace-pre-wrap px-3 pb-3 text-xs leading-relaxed text-[var(--txt-2)]">{body}</p>
    </details>
  );
}

export default async function MessagesPage() {
  const me = await getMeOrRedirect();
  const locale = await getLocale();

  const isAdmin = me.role === 'admin';
  const [inboxRows, sentRows, allMembers, everyMember, allRecent] = await Promise.all([
    db.select().from(messages).where(eq(messages.toId, me.id)).orderBy(desc(messages.createdAt)).limit(50),
    db.select().from(messages).where(eq(messages.fromId, me.id)).orderBy(desc(messages.createdAt)).limit(50),
    db
      .select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, role: members.role, phone: members.phone })
      .from(members)
      // Approved + living only — rejected rows (incl. old test accounts
      // that audit FKs keep alive) must never appear as recipients.
      .where(and(eq(members.deceased, false), eq(members.status, 'approved')))
      .orderBy(asc(members.nameEn)),
    // Name resolution for oversight can't be status-filtered — an old
    // sender may since have been rejected, but their message still shows.
    db.select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr }).from(members),
    isAdmin
      ? db.select().from(messages).orderBy(desc(messages.createdAt)).limit(60)
      : Promise.resolve([]),
  ]);
  const inbox = inboxRows;
  const sent = sentRows;
  const recipients = allMembers.filter((m) => m.role === 'admin' || m.role === 'supervisor');
  const memById = new Map(allMembers.map((m) => [m.id, m]));
  const nameById = new Map(everyMember.map((m) => [m.id, m.nameEn || m.nameUr || '?']));
  const unread = inbox.filter((m) => !m.read).length;

  return (
    <div className="mx-auto w-full max-w-5xl">
    <PageHeader title="Messages" titleUr="پیغامات" subtitle="Contact the admin team, and read replies here" />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{t('msg.send', locale)} · پیغام بھیجیں</CardTitle></CardHeader>
        <CardBody>
          <MessageForm recipients={recipients} />
          {/* wa.me needs no Cloud API — works the moment an admin has a phone */}
          {recipients.some((r) => r.phone) && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              {recipients.filter((r) => r.phone).map((r) => (
                <a
                  key={r.id}
                  href={`https://wa.me/${r.phone!.replace(/[^0-9]/g, '').replace(/^0/, '92')}?text=${encodeURIComponent('السلام علیکم · Barakah Hub se rabta')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(45,138,95,0.4)] bg-[rgba(45,138,95,0.10)] px-3 py-1.5 text-xs font-semibold text-[#4ec38d] transition-colors hover:bg-[rgba(45,138,95,0.18)]"
                >
                  WhatsApp · {r.nameUr || r.nameEn}
                </a>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-4)]">INBOX</span>
              {' '}({unread} unread / {inbox.length})
            </CardTitle>
            {unread > 0 && <MarkAllRead />}
          </CardHeader>
          <CardBody className="p-0">
            {inbox.length === 0 && (
              <div className="py-12 text-center text-sm italic text-[var(--txt-3)]">Inbox empty</div>
            )}
            {inbox.map((m) => {
              const sender = memById.get(m.fromId);
              return (
                <MessageItem
                  key={m.id}
                  heading={sender?.nameEn || sender?.nameUr || '?'}
                  date={m.createdAt}
                  subject={m.subject}
                  body={m.body}
                  unread={!m.read}
                />
              );
            })}
          </CardBody>
        </Card>

        {sent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-4)]">SENT</span>
                {' '}({sent.length})
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {sent.map((m) => {
                const recipient = memById.get(m.toId);
                return (
                  <MessageItem
                    key={m.id}
                    heading={`To: ${recipient?.nameEn || recipient?.nameUr || '?'}`}
                    date={m.createdAt}
                    subject={m.subject}
                    body={m.body}
                  />
                );
              })}
            </CardBody>
          </Card>
        )}

        {isAdmin && allRecent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold-4)]">ALL MESSAGES · نگرانی</span>
                {' '}({allRecent.length})
              </CardTitle>
            </CardHeader>
            <CardBody className="max-h-[420px] overflow-y-auto p-0">
              {allRecent.map((m) => (
                <MessageItem
                  key={`all-${m.id}`}
                  heading={`${nameById.get(m.fromId) ?? '?'} → ${nameById.get(m.toId) ?? '?'}`}
                  date={m.createdAt}
                  subject={m.subject}
                  body={m.body}
                />
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
}

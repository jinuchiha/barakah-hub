import { eq, desc } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import MarkAllReadButton from './mark-all-read';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight } from 'lucide-react';
import { notificationHref } from '@/lib/notification-link';
import { t } from '@/lib/i18n/dict';
import { getLocale } from '@/lib/i18n/server';

export const metadata = { title: 'Notifications · Barakah Hub' };

export default async function NotificationsPage() {
  const me = await getMeOrRedirect();
  const locale = await getLocale();

  const list = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, me.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  const unread = list.filter((n) => !n.read).length;

  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">اطلاعات</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">{unread} unread of {list.length}</p>
        </div>
        {unread > 0 && <MarkAllReadButton />}
      </header>

      <Card>
        <CardHeader><CardTitle>{t('msg.inbox', locale)}</CardTitle></CardHeader>
        <CardBody className="p-0">
          {list.length === 0 && (
            <div className="py-12 text-center text-sm italic text-[var(--txt-3)]">All caught up · کوئی اطلاع نہیں</div>
          )}
          {list.map((n) => {
            const href = notificationHref(n.type);
            const body = (
              <>
                <div className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'border border-[var(--border)]' : 'bg-[var(--color-emerald-2)]'}`}>
                  {!n.read && <span className="sr-only">Unread</span>}
                </div>
                <div className="min-w-0 flex-1">
                  {(n.titleUr || n.titleEn) && (
                    <div className="mb-0.5 font-semibold text-[var(--color-gold)]">
                      {n.titleEn}{n.titleUr && n.titleUr !== n.titleEn ? ` · ${n.titleUr}` : ''}
                    </div>
                  )}
                  <div dir="rtl" className="font-[var(--font-arabic)] text-sm text-[var(--color-cream)]">{n.ur}</div>
                  <div className="text-xs italic text-[var(--txt-3)]">{n.en}</div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-gold-4)]">
                    <span>{new Date(n.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span className="rounded-full bg-[var(--surf-3)] px-2 py-0.5">{n.type}</span>
                  </div>
                </div>
                {href && <ArrowRight aria-hidden className="mt-2 size-3.5 shrink-0 text-[var(--txt-4)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-gold-2)]" />}
              </>
            );
            const rowClass = `flex gap-3 border-b border-[rgba(214,210,199,0.06)] p-3 ${n.read ? '' : 'bg-[rgba(30,42,74,0.05)]'}`;
            // Every row passes through the open route so the click ALSO
            // marks it read (bell badge drops) before landing on target.
            return (
              <Link key={n.id} href={`/notifications/open/${n.id}` as Route} className={`group ${rowClass} transition-colors hover:bg-[var(--surf-3)]`}>
                {body}
              </Link>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

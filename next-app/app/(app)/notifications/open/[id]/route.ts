import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { and, eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { notificationHref } from '@/lib/notification-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Click-through for a notification: mark THAT one read (so the bell
 * badge drops immediately), then land on the screen it is about.
 * Recipient-scoped — nobody can mark someone else's notification.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await meOrThrow();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect('/notifications');

  // A GET with a write side-effect must ignore speculative fetches — Next
  // Link prefetch, browser prerender, and mail scanners would otherwise
  // mark rows read without a real click.
  const h = req.headers;
  if (
    h.get('next-router-prefetch') === '1' ||
    (h.get('purpose') ?? h.get('sec-purpose') ?? '').includes('prefetch') ||
    (h.get('sec-purpose') ?? '').includes('prerender')
  ) {
    redirect('/notifications');
  }

  const [n] = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, me.id)))
    .returning({ type: notifications.type });

  redirect((notificationHref(n?.type ?? null) ?? '/notifications') as Route);
}

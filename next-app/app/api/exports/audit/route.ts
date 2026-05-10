import { desc, inArray } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { auditLog, members } from '@/lib/db/schema';
import { csvResponse, toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const entries = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(5000);

  const memberIds = [...new Set([
    ...entries.map((e) => e.actorId).filter((v): v is string => !!v),
    ...entries.map((e) => e.targetId).filter((v): v is string => !!v),
  ])];
  const referenced = memberIds.length > 0
    ? await db.select().from(members).where(inArray(members.id, memberIds))
    : [];
  const memById = new Map(referenced.map((m) => [m.id, m.nameEn || m.nameUr || m.username]));

  const csv = toCsv(
    ['id', 'created_at', 'action', 'actor', 'target', 'detail', 'metadata'],
    entries.map((e) => [
      e.id,
      e.createdAt,
      e.action,
      e.actorId ? (memById.get(e.actorId) ?? e.actorId) : '',
      e.targetId ? (memById.get(e.targetId) ?? e.targetId) : '',
      e.detail ?? '',
      e.metadata ? JSON.stringify(e.metadata) : '',
    ]),
  );

  return csvResponse('barakah-audit', csv);
}

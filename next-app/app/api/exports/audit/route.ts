import { and, desc, eq, gte, lte, inArray, or, ilike, type SQL } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { auditLog, members } from '@/lib/db/schema';
import { csvResponse, toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') return new Response('Forbidden', { status: 403 });

  // Mirror the same filters as the audit log UI so admins can export the
  // exact subset they're looking at.
  const url = new URL(req.url);
  const filterAction = url.searchParams.get('action') ?? '';
  const filterMember = url.searchParams.get('member') ?? '';
  const filterFrom = url.searchParams.get('from') ?? '';
  const filterTo = url.searchParams.get('to') ?? '';
  const filterQ = (url.searchParams.get('q') ?? '').trim();

  const where: SQL[] = [];
  if (filterAction) where.push(eq(auditLog.action, filterAction));
  if (filterMember) {
    const clause = or(eq(auditLog.actorId, filterMember), eq(auditLog.targetId, filterMember));
    if (clause) where.push(clause);
  }
  if (filterFrom) where.push(gte(auditLog.createdAt, new Date(filterFrom)));
  if (filterTo) {
    const endDate = new Date(filterTo);
    endDate.setHours(23, 59, 59, 999);
    where.push(lte(auditLog.createdAt, endDate));
  }
  if (filterQ) where.push(ilike(auditLog.detail, `%${filterQ.replace(/[%_]/g, '\\$&')}%`));

  const entries = await db
    .select()
    .from(auditLog)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(5000);

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

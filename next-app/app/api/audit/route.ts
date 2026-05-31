import { NextResponse } from 'next/server';
import { desc, inArray } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { auditLog, members } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Recent audit log (admin) as JSON, with actor names resolved. */
export async function GET() {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(100);
    const ids = [...new Set(rows.flatMap((r) => [r.actorId, r.targetId].filter(Boolean) as string[]))];
    const people = ids.length
      ? await db.select({ id: members.id, nameEn: members.nameEn }).from(members).where(inArray(members.id, ids))
      : [];
    const nameById = new Map(people.map((p) => [p.id, p.nameEn]));

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        action: r.action,
        detail: r.detail,
        actor: nameById.get(r.actorId) ?? 'System',
        target: r.targetId ? nameById.get(r.targetId) ?? null : null,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

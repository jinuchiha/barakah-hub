import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { cases, votes, members, auditLog, config as configTbl } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ yes: z.boolean() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await meOrThrow();
    const { id: caseId } = await params;

    if (!/^[0-9a-f-]{36}$/i.test(caseId)) {
      return NextResponse.json({ error: 'Invalid case id' }, { status: 400 });
    }

    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    if (c.status !== 'voting') return NextResponse.json({ error: 'Voting closed' }, { status: 409 });
    if (c.applicantId === me.id) return NextResponse.json({ error: 'Cannot vote on own case' }, { status: 403 });

    const body = await req.json();
    const { yes } = schema.parse(body);

    await db.insert(votes).values({ caseId, memberId: me.id, vote: yes }).onConflictDoNothing();

    const allVotes = await db.select().from(votes).where(eq(votes.caseId, caseId));
    const yesCount = allVotes.filter((v) => v.vote).length;
    const noCount = allVotes.filter((v) => !v.vote).length;

    const eligibleCount = await db.$count(
      members,
      and(eq(members.deceased, false), eq(members.status, 'approved')),
    );
    const eligible = Math.max(0, eligibleCount - 1);
    const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
    const need = Math.ceil(eligible * ((cfg?.voteThresholdPct ?? 50) / 100));

    if (yesCount >= need) {
      await db.update(cases).set({ status: 'approved', resolvedAt: new Date() }).where(eq(cases.id, caseId));
    } else if (noCount >= need) {
      await db.update(cases).set({ status: 'rejected', resolvedAt: new Date() }).where(eq(cases.id, caseId));
    }

    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'vote-cast',
      detail: `Voted ${yes ? 'YES' : 'NO'} on case ${caseId}`,
      targetId: c.applicantId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

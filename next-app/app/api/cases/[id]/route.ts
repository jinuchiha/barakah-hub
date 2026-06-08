import { NextResponse } from 'next/server';
import { eq, inArray, count, and } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { cases, votes, members, loans, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/cases/[id] — single case with vote counts, used by useRealtimeCase. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await meOrThrow();
    const { id: caseId } = await params;
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const caseVotes = await db.select().from(votes).where(eq(votes.caseId, caseId));
    const [{ value: eligibleCount }] = await db
      .select({ value: count() })
      .from(members)
      .where(and(eq(members.deceased, false), eq(members.status, 'approved')));
    const myVote = caseVotes.find((v) => v.memberId === me.id);

    return NextResponse.json({
      ...c,
      yesVotes: caseVotes.filter((v) => v.vote).length,
      noVotes: caseVotes.filter((v) => !v.vote).length,
      totalEligible: Math.max(1, eligibleCount - 1),
      myVote: myVote ? myVote.vote : null,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * Admin delete. Votes cascade via the votes.caseId FK. Disbursed cases
 * with a linked loan are refused so the loan ledger stays consistent.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    const { id: caseId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(caseId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    if (c.status === 'disbursed') {
      const [linkedLoan] = await db.select({ id: loans.id }).from(loans).where(eq(loans.caseId, caseId)).limit(1);
      if (linkedLoan) {
        return NextResponse.json(
          { error: 'Case is disbursed and linked to an active loan — settle the loan first' },
          { status: 409 },
        );
      }
    }

    await db.delete(cases).where(eq(cases.id, caseId));
    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'case-deleted',
      detail: `Deleted case ${c.beneficiaryName} (${c.amount})`,
      targetId: c.applicantId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

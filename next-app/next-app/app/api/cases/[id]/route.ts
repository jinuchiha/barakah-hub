import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { cases, loans, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

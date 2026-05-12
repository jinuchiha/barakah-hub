import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { loans, repayments, auditLog } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  amount: z.number().int().positive().max(10_000_000),
  note: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { amount, note } = schema.parse(body);
    const loanId = params.id;

    const updated = await db
      .update(loans)
      .set({
        paid: sql`${loans.paid} + ${amount}`,
        active: sql`(${loans.paid} + ${amount}) < ${loans.amount}`,
      })
      .where(
        and(
          eq(loans.id, loanId),
          eq(loans.active, true),
          sql`(${loans.paid} + ${amount}) <= ${loans.amount}`,
        ),
      )
      .returning();

    if (updated.length === 0) {
      const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1);
      if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      if (!loan.active) return NextResponse.json({ error: 'Loan already settled' }, { status: 409 });
      return NextResponse.json({ error: `Amount exceeds remaining ${loan.amount - loan.paid}` }, { status: 422 });
    }

    await db.insert(repayments).values({ loanId, amount, note });
    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'loan-repay',
      detail: `Repayment ${amount} on loan ${loanId}`,
      targetId: updated[0].memberId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

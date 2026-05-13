import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, auditLog } from '@/lib/db/schema';
import { monthStartFromLabel } from '@/lib/month';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  amount: z.number().int().positive().max(10_000_000),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']).default('sadaqah'),
  monthLabel: z.string().min(3).max(40),
  note: z.string().max(200).optional(),
  receiptUrl: z.string().url().or(z.string().startsWith('/uploads/')).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await meOrThrow();
    if (me.status !== 'approved') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 });
    }
    const body = await req.json();
    const data = schema.parse(body);

    const [created] = await db
      .insert(payments)
      .values({
        memberId: me.id,
        ...data,
        monthStart: monthStartFromLabel(data.monthLabel),
        pendingVerify: true,
      })
      .returning();

    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'payment-self-submit',
      detail: `Submitted ${data.pool} ${data.amount} for ${data.monthLabel}`,
      targetId: me.id,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

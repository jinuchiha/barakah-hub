import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { meApprovedOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, auditLog } from '@/lib/db/schema';
import { monthStartFromLabel } from '@/lib/month';
import { notifyMembers, fundApproverIds } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  amount: z.number().int().positive().max(10_000_000),
  // Members self-submit donations only — the qarz pool is disbursed by
  // admins, never self-credited.
  pool: z.enum(['sadaqah', 'zakat']).default('sadaqah'),
  monthLabel: z.string().min(3).max(40),
  note: z.string().max(200).optional(),
  receiptUrl: z.string().url().or(z.string().startsWith('/uploads/')).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await meApprovedOrThrow(); // approved + not deceased
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

    void notifyMembers(
      await fundApproverIds(me.id),
      { titleEn: 'New payment to review', titleUr: 'نئی ادائیگی برائے منظوری', en: `${me.nameEn || me.nameUr} submitted Rs ${data.amount} (${data.pool}) for ${data.monthLabel}.`, ur: `${me.nameUr || me.nameEn} نے ${data.monthLabel} کے لیے روپے ${data.amount} جمع کیے۔`, type: 'payment-pending' },
      { title: '🧾 New payment to review', body: `${me.nameEn || me.nameUr} — Rs ${data.amount} ${data.pool}`, data: { type: 'payment-pending' }, channelId: 'payments' },
    ).catch(() => {});

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

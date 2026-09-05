import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { meApprovedOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One member's complete donation record: full history + computed totals.
 *
 * This endpoint is WHY the mobile member profile can be data-driven: before
 * it existed there was no way to ask "what has this member donated" —
 * /api/payments returns everything (admin-only) and /api/payments/mine only
 * the caller's own rows.
 *
 * Authorization mirrors the rest of the money surface:
 *   · admins and supervisors (the verification workflow) see any member;
 *   · a member sees their own record;
 *   · everyone else gets 403 — donation history is financial data, not
 *     directory data.
 *
 * Totals are computed here, not in the client, so every consumer (mobile
 * profile, future web view) shows the same numbers by construction.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await meApprovedOrThrow();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const canView = me.id === id || me.role === 'admin' || me.role === 'supervisor';
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.memberId, id))
      .orderBy(desc(payments.monthStart), desc(payments.createdAt));

    const totals = {
      /** Sum of VERIFIED amounts only — the number that counts toward the fund. */
      verified: 0,
      /** Sum still awaiting supervisor/admin verification. */
      pending: 0,
      count: rows.length,
      verifiedCount: 0,
      byPool: { sadaqah: 0, zakat: 0, qarz: 0 } as Record<string, number>,
      lastPaidOn: rows[0]?.paidOn ?? null,
    };
    // `status` is the single source of truth (migration 0019); the legacy
    // nullable columns exist only for API-shape compatibility.
    for (const p of rows) {
      if (p.status === 'verified') {
        totals.verified += p.amount;
        totals.verifiedCount += 1;
        totals.byPool[p.pool] = (totals.byPool[p.pool] ?? 0) + p.amount;
      } else if (p.status === 'submitted' || p.status === 'supervisor_approved') {
        totals.pending += p.amount;
      }
      // supervisor_rejected and voided rows appear in history, never in totals.
    }

    return NextResponse.json({ payments: rows, totals });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Account not approved' ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? 'Error' : msg }, { status });
  }
}

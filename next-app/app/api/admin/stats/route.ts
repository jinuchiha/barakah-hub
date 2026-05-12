import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, payments, loans, cases } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const me = await meOrThrow();
    if (me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [pendingMembers, pendingPayments, activeLoans, votingCases] = await Promise.all([
      db.$count(members, eq(members.status, 'pending')),
      db.$count(payments, eq(payments.pendingVerify, true)),
      db.$count(loans, eq(loans.active, true)),
      db.$count(cases, eq(cases.status, 'voting')),
    ]);

    return NextResponse.json({ pendingMembers, pendingPayments, activeLoans, votingCases });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

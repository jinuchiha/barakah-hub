import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { cases, votes, members, auditLog } from '@/lib/db/schema';
type CaseStatus = 'voting' | 'approved' | 'rejected' | 'disbursed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const me = await meOrThrow();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as CaseStatus | null;

    const condition = status ? eq(cases.status, status) : undefined;
    const allCases = await db
      .select()
      .from(cases)
      .where(condition)
      .orderBy(desc(cases.createdAt));

    const allVotes = await db.select().from(votes);
    const allMembers = await db.select({ id: members.id, deceased: members.deceased, status: members.status }).from(members);
    const eligibleCount = allMembers.filter((m) => !m.deceased && m.status === 'approved').length;

    const enriched = allCases.map((c) => {
      const caseVotes = allVotes.filter((v) => v.caseId === c.id);
      const myVote = caseVotes.find((v) => v.memberId === me.id);
      return {
        ...c,
        yesVotes: caseVotes.filter((v) => v.vote).length,
        noVotes: caseVotes.filter((v) => !v.vote).length,
        totalEligible: Math.max(1, eligibleCount - 1),
        myVote: myVote ? myVote.vote : null,
      };
    });

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

const caseSchema = z.object({
  caseType: z.enum(['gift', 'qarz']),
  pool: z.enum(['sadaqah', 'zakat', 'qarz']).default('sadaqah'),
  category: z.string().min(1).max(40),
  beneficiaryName: z.string().min(2).max(80),
  relation: z.string().max(40).optional(),
  city: z.string().max(60).optional(),
  amount: z.number().int().positive().max(10_000_000),
  reasonUr: z.string().min(3).max(500),
  reasonEn: z.string().min(3).max(500),
  emergency: z.boolean().default(false),
  returnDate: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await meOrThrow();
    if (me.status !== 'approved') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 });
    }
    const body = await req.json();
    const data = caseSchema.parse(body);

    const [created] = await db
      .insert(cases)
      .values({ ...data, applicantId: me.id, status: 'voting' })
      .returning();

    await db.insert(auditLog).values({
      actorId: me.id,
      action: 'emergency-create',
      detail: `${data.caseType} ${data.amount} for ${data.beneficiaryName}`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

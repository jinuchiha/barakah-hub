import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { payments, cases, loans, members } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Community activity feed.
 *
 * Islamic privacy principle: Sadaqah / Zakat donor identity is hidden
 * from the wider community — "ek haath de aur dusray ko pata na chale".
 * Only the donor themselves and admins see the name. Everyone else sees
 * "ایک رکن" / "A member".
 *
 * Qarz (loan) + emergency cases ARE public — borrowers/applicants are
 * known to the community because votes + repayment tracking require it.
 */
export async function GET() {
  try {
    const me = await meOrThrow();
    if (me.status !== 'approved') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 });
    }

    const isAdmin = me.role === 'admin';

    const [recentPayments, recentCases, recentLoans, allMembers] = await Promise.all([
      db.select().from(payments).orderBy(desc(payments.createdAt)).limit(20),
      db.select().from(cases).orderBy(desc(cases.createdAt)).limit(10),
      db.select().from(loans).orderBy(desc(loans.issuedOn)).limit(10),
      db.select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr, color: members.color, photoUrl: members.photoUrl }).from(members).where(eq(members.deceased, false)),
    ]);

    const memById = new Map(allMembers.map((m) => [m.id, m]));

    /** Hide the donor for Sadaqah & Zakat from everyone except the donor + admins. */
    function maskDonor(memberId: string, pool: string) {
      const isPrivatePool = pool === 'sadaqah' || pool === 'zakat';
      const isSelf = memberId === me.id;
      if (!isPrivatePool || isSelf || isAdmin) {
        return memById.get(memberId) ?? null;
      }
      return { id: 'anon', nameEn: 'A member', nameUr: 'ایک رکن', color: '#475569', photoUrl: null };
    }

    return NextResponse.json({
      payments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        pool: p.pool,
        monthLabel: p.monthLabel,
        pendingVerify: p.pendingVerify,
        createdAt: p.createdAt,
        member: maskDonor(p.memberId, p.pool),
      })),
      cases: recentCases.map((c) => ({
        id: c.id,
        category: c.category,
        beneficiaryName: c.beneficiaryName,
        amount: c.amount,
        status: c.status,
        emergency: c.emergency,
        createdAt: c.createdAt,
        applicant: memById.get(c.applicantId) ?? null,
      })),
      loans: recentLoans.map((l) => ({
        id: l.id,
        amount: l.amount,
        paid: l.paid,
        purpose: l.purpose,
        active: l.active,
        issuedOn: l.issuedOn,
        member: memById.get(l.memberId) ?? null,
      })),
      memberCount: allMembers.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed';
    const status = msg === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

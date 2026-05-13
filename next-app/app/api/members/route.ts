import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, ne, and } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/members
 *
 * Visibility rules:
 *  - Regular members see only approved members.
 *  - Admins see approved + pending by default (so they can review
 *    new applicants and edit existing accounts). Rejected accounts
 *    are filtered out so they don't pollute the directory / family
 *    tree / WhatsApp picker.
 *  - To explicitly review rejected accounts, admins pass
 *    `?includeRejected=1` (used by the admin-members page when the
 *    "Show rejected" toggle is on).
 *
 * Sensitive fields (phone, monthlyPledge) are stripped for non-admin
 * viewers so the directory can't be used as a contact-harvesting tool.
 */
export async function GET(req: NextRequest) {
  try {
    const me = await meOrThrow();
    const includeRejected = req.nextUrl.searchParams.get('includeRejected') === '1';

    const rows = me.role === 'admin'
      ? await db
          .select()
          .from(members)
          .where(includeRejected ? undefined : ne(members.status, 'rejected'))
          .orderBy(asc(members.nameEn))
      : await db
          .select()
          .from(members)
          .where(and(eq(members.status, 'approved'), ne(members.status, 'rejected')))
          .orderBy(asc(members.nameEn));

    if (me.role !== 'admin') {
      return NextResponse.json(
        rows.map(({ monthlyPledge: _mp, phone, ...rest }) => rest),
      );
    }

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

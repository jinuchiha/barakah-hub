import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { config as configTbl } from '@/lib/db/schema';
import { updateAdminConfig } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/config — all authenticated members can read public fields.
 *  Admin-only fields (themePalette, orgName, etc.) are filtered for non-admins.
 *  Members need easyPaiseName/easyPaiseNumber to know where to send payment. */
export async function GET() {
  try {
    const me = await meOrThrow();
    const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
    if (!cfg) return NextResponse.json({});

    if (me.role === 'admin') return NextResponse.json(cfg);

    // Non-admin: only expose fields members need
    return NextResponse.json({
      voteThresholdPct:     cfg.voteThresholdPct,
      defaultMonthlyPledge: cfg.defaultMonthlyPledge,
      goalAmount:           cfg.goalAmount,
      goalLabelEn:          cfg.goalLabelEn,
      goalLabelUr:          cfg.goalLabelUr,
      goalDeadline:         cfg.goalDeadline,
      easyPaiseName:        cfg.easyPaiseName,
      easyPaiseNumber:      cfg.easyPaiseNumber,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/** PATCH /api/config — update vote threshold + default pledge (admin only). */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    await updateAdminConfig(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

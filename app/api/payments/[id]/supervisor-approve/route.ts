import { NextRequest, NextResponse } from 'next/server';
import { supervisorApprovePayment } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Supervisor (or admin) pre-approves a pending payment. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await supervisorApprovePayment(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401
      : msg === 'Supervisor or admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

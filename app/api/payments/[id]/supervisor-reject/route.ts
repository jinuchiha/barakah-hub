import { NextRequest, NextResponse } from 'next/server';
import { supervisorRejectPayment } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Supervisor (or admin) rejects a pending payment with an optional note. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const note = typeof body?.note === 'string' ? body.note : undefined;
    await supervisorRejectPayment(id, note);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401
      : msg === 'Supervisor or admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

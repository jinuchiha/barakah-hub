import { NextRequest, NextResponse } from 'next/server';
import { adminResendPaymentToSupervisor } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin resends a supervisor-rejected payment back for re-approval. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await adminResendPaymentToSupervisor(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

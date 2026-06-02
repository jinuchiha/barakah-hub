import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Final admin verification. Delegates to the verifyPayment server action so
 * the REST surface (mobile) enforces the EXACT same two-step rules as the
 * web: rejects if already verified or if the supervisor rejected the
 * payment (cash is physically with the supervisor — admin must resend or
 * delete instead). Keeps web and app behaviour identical.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await verifyPayment(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

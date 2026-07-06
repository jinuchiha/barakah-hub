import { NextRequest, NextResponse } from 'next/server';
import { revokeInvite } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Revoke an invite (admin). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await revokeInvite(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Admin only' ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

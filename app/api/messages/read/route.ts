import { NextResponse } from 'next/server';
import { markAllMessagesRead } from '@/app/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mark all of my received messages read. */
export async function POST() {
  try {
    await markAllMessagesRead();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

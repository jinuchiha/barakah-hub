import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Uptime-monitor probe — app up + database reachable. No auth, no data.
 *  dbHost identifies WHICH Neon endpoint serves prod (hostname only, no
 *  credentials) — the connection string itself is sealed in Vercel. */
export async function GET() {
  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').hostname;
    } catch {
      return null;
    }
  })();
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, db: true, dbHost });
  } catch {
    return NextResponse.json({ ok: false, db: false, dbHost }, { status: 503 });
  }
}

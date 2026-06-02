import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const me = await meOrThrow();
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, me.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, auditLog, notifications } from '@/lib/db/schema';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const [me] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!me || me.role !== 'admin') {
    return new NextResponse('Admin only', { status: 403 });
  }

  const formData = await req.formData();
  const id = formData.get('id') as string;
  if (!id) return new NextResponse('Missing id', { status: 400 });

  const [m] = await db.select().from(members).where(eq(members.id, id)).limit(1);
  if (!m) return new NextResponse('Not found', { status: 404 });

  await db.update(members).set({ status: 'approved' }).where(eq(members.id, id));
  await db.insert(auditLog).values({
    actorId: me.id,
    targetId: id,
    action: 'member-approved',
    detail: `Approved ${m.nameEn || m.nameUr}`,
  });
  await db.insert(notifications).values({
    recipientId: id,
    ur: 'آپ کا اکاؤنٹ منظور ہو گیا — اب آپ ایپ استعمال کر سکتے ہیں',
    en: 'Your account has been approved — you can now use the app',
    type: 'approved',
  });

  return NextResponse.redirect(new URL('/admin/members', req.url));
}

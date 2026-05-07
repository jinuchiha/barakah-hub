import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, notifications } from '@/lib/db/schema';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { VerseBar } from '@/components/verse-bar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [me] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!me) redirect('/onboarding');

  const unreadCount = await db.$count(notifications, eq(notifications.recipientId, me.id));

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        user={{ name: me.nameEn || me.nameUr, role: me.role === 'admin' ? 'Admin' : 'Member', color: me.color, photoUrl: me.photoUrl }}
        unreadCount={unreadCount}
      />
      <VerseBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isAdmin={me.role === 'admin'} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

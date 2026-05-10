import { eq, and } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { VerseBar } from '@/components/verse-bar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMeOrRedirect();

  const unreadCount = await db.$count(
    notifications,
    and(eq(notifications.recipientId, me.id), eq(notifications.read, false)),
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col">
        <Topbar
          user={{ name: me.nameEn || me.nameUr, role: me.role === 'admin' ? 'Admin' : 'Member', color: me.color, photoUrl: me.photoUrl }}
          unreadCount={unreadCount}
          isAdmin={me.role === 'admin'}
        />
        <VerseBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isAdmin={me.role === 'admin'} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

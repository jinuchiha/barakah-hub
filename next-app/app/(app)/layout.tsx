import { eq, and } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { notifications, members, payments } from '@/lib/db/schema';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { VerseBar } from '@/components/verse-bar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMeOrRedirect();
  const isAdmin = me.role === 'admin';
  const isSupervisor = me.role === 'supervisor';

  const [unreadCount, pendingMembers, pendingPayments] = await Promise.all([
    db.$count(notifications, and(eq(notifications.recipientId, me.id), eq(notifications.read, false))),
    isAdmin ? db.$count(members, eq(members.status, 'pending')) : Promise.resolve(0),
    isAdmin || isSupervisor ? db.$count(payments, eq(payments.pendingVerify, true)) : Promise.resolve(0),
  ]);

  const adminBadges: Record<string, number> = {};
  if (pendingMembers > 0) adminBadges['/admin/members'] = pendingMembers;
  if (pendingPayments > 0) adminBadges['/admin/fund'] = pendingPayments;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col">
        <Topbar
          user={{
            name: me.nameEn || me.nameUr,
            role: isAdmin ? 'Admin' : isSupervisor ? 'Supervisor' : 'Member',
            color: me.color,
            photoUrl: me.photoUrl,
          }}
          unreadCount={unreadCount}
          isAdmin={isAdmin}
          badges={adminBadges}
        />
        <VerseBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar isAdmin={isAdmin} isSupervisor={isSupervisor} badges={adminBadges} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

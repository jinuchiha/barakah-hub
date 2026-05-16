import { eq, and, isNull } from 'drizzle-orm';
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

  /**
   * Sidebar badge counts. Each role sees only the count they can act on:
   *  - Admin: ALL pending payments (anything in approval flow)
   *  - Supervisor: only payments awaiting their first decision —
   *    not the ones they already approved or rejected, and not the
   *    ones admin is still resending. The badge must match what they
   *    actually see on the Fund Approvals page.
   */
  const [unreadCount, pendingMembers, pendingPayments] = await Promise.all([
    db.$count(notifications, and(eq(notifications.recipientId, me.id), eq(notifications.read, false))),
    isAdmin ? db.$count(members, eq(members.status, 'pending')) : Promise.resolve(0),
    isAdmin
      ? db.$count(payments, eq(payments.pendingVerify, true))
      : isSupervisor
        ? db.$count(
            payments,
            and(
              eq(payments.pendingVerify, true),
              isNull(payments.supervisorApprovedAt),
              isNull(payments.supervisorRejectedAt),
            ),
          )
        : Promise.resolve(0),
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

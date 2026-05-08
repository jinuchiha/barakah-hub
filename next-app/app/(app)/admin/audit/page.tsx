import { redirect } from 'next/navigation';
import { eq, desc, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, auditLog } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { ini } from '@/lib/utils';

export const metadata = { title: 'Audit Log · Barakah Hub' };

const ICONS: Record<string, string> = {
  login: '🔓', logout: '🔒',
  'member-approved': '✅', 'member-rejected': '❌', 'member-added': '➕', 'member-deleted': '✕', 'member-edited': '✎', 'member-deceased': '✟',
  'payment-record': '💰', 'payment-verified': '✓', 'payment-rejected': '✗', 'payment-self-submit': '🤲',
  'vote-cast': '🗳️', 'emergency-create': '🚨', 'emergency-approved': '✓', 'emergency-rejected': '✗',
  'loan-issue': '📤', 'loan-repay': '↩',
  'password-reset': '🔑', 'forgot-password-failed': '⚠',
  'profile-updated': '👤', 'config-changed': '⚙️',
  'message-sent': '✉️',
};

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [me] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!me) redirect('/onboarding');
  if (me.role !== 'admin') redirect('/dashboard');

  const entries = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(300);
  const memberIds = [...new Set([
    ...entries.map((e) => e.actorId).filter((v): v is string => !!v),
    ...entries.map((e) => e.targetId).filter((v): v is string => !!v),
  ])];
  const referencedMembers = memberIds.length > 0
    ? await db.select().from(members).where(inArray(members.id, memberIds))
    : [];
  const memById = new Map(referencedMembers.map((m) => [m.id, m]));

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">آڈٹ لاگ</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Tamper-evident activity journal · INSERT-only at DB layer</p>
        </div>
        <div className="text-xs text-[var(--color-gold-4)]">Showing latest {entries.length} entries</div>
      </header>

      <Card>
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardBody className="p-0">
          {entries.length === 0 && (
            <div className="py-10 text-center italic text-[var(--txt-3)]">No audit entries yet · every action will be logged here automatically.</div>
          )}
          {entries.map((e) => {
            const actor = e.actorId ? memById.get(e.actorId) : null;
            const target = e.targetId ? memById.get(e.targetId) : null;
            const icon = ICONS[e.action] || '•';
            const dt = new Date(e.createdAt);
            return (
              <div key={e.id} className="flex items-center gap-3 border-b border-[rgba(201,168,76,0.06)] px-4 py-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: actor?.color || '#888' }}>
                  {actor ? ini(actor.nameEn || actor.nameUr) : '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-cream)]">
                    {icon} {e.action.replace(/-/g, ' ')}
                  </div>
                  <div className="text-[11px] text-[var(--color-gold-4)]">
                    {actor?.nameEn || actor?.nameUr || 'system'}
                    {target && target.id !== actor?.id && <> → {target.nameEn || target.nameUr}</>}
                  </div>
                  {e.detail && <div className="mt-0.5 truncate font-[var(--font-en)] text-[11px] text-[var(--txt-2)]">{e.detail}</div>}
                </div>
                <div className="shrink-0 text-right font-[var(--font-en)] text-[10px] text-[var(--color-gold-4)]">
                  <div>{dt.toLocaleDateString('en-GB')}</div>
                  <div>{dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

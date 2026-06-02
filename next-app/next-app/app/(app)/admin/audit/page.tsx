import { redirect } from 'next/navigation';
import { and, desc, eq, gte, lte, inArray, or, ilike, type SQL } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, auditLog } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { ini } from '@/lib/utils';
import { ExportLink } from '@/components/export-link';

export const metadata = { title: 'Audit Log · Barakah Hub' };

const ICONS: Record<string, string> = {
  login: '🔓', logout: '🔒',
  'member-approved': '✅', 'member-rejected': '❌', 'member-added': '➕', 'member-deleted': '✕', 'member-edited': '✎', 'member-deceased': '✟',
  'payment-record': '💰', 'payment-verified': '✓', 'payment-rejected': '✗', 'payment-self-submit': '🤲',
  'vote-cast': '🗳️', 'emergency-create': '🚨', 'emergency-approved': '✓', 'emergency-rejected': '✗', 'case-disbursed': '💸',
  'loan-issue': '📤', 'loan-repay': '↩',
  'password-reset': '🔑', 'forgot-password-failed': '⚠',
  'profile-updated': '👤', 'config-changed': '⚙️',
  'message-sent': '✉️', 'broadcast': '📢', 'setup-complete': '🎉',
};

const ACTION_GROUPS = [
  { label: 'All actions', value: '' },
  { label: '— Members —', value: '', disabled: true },
  { label: 'Member approved', value: 'member-approved' },
  { label: 'Member rejected', value: 'member-rejected' },
  { label: 'Member added', value: 'member-added' },
  { label: 'Member edited', value: 'member-edited' },
  { label: 'Member deleted', value: 'member-deleted' },
  { label: 'Member deceased', value: 'member-deceased' },
  { label: '— Payments —', value: '', disabled: true },
  { label: 'Payment recorded', value: 'payment-record' },
  { label: 'Self-submitted', value: 'payment-self-submit' },
  { label: 'Payment verified', value: 'payment-verified' },
  { label: 'Payment rejected', value: 'payment-rejected' },
  { label: '— Cases —', value: '', disabled: true },
  { label: 'Case created', value: 'emergency-create' },
  { label: 'Vote cast', value: 'vote-cast' },
  { label: 'Case approved', value: 'emergency-approved' },
  { label: 'Case rejected', value: 'emergency-rejected' },
  { label: 'Case disbursed', value: 'case-disbursed' },
  { label: '— Loans —', value: '', disabled: true },
  { label: 'Loan issued', value: 'loan-issue' },
  { label: 'Loan repayment', value: 'loan-repay' },
  { label: '— Admin —', value: '', disabled: true },
  { label: 'Config changed', value: 'config-changed' },
  { label: 'Broadcast sent', value: 'broadcast' },
];

interface PageProps {
  searchParams: Promise<{ action?: string; member?: string; from?: string; to?: string; q?: string }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const params = await searchParams;
  const filterAction = params.action ?? '';
  const filterMemberId = params.member ?? '';
  const filterFrom = params.from ?? '';
  const filterTo = params.to ?? '';
  const filterQ = (params.q ?? '').trim();

  // Build the WHERE clauses
  const where: SQL[] = [];
  if (filterAction) where.push(eq(auditLog.action, filterAction));
  if (filterMemberId) {
    const clause = or(eq(auditLog.actorId, filterMemberId), eq(auditLog.targetId, filterMemberId));
    if (clause) where.push(clause);
  }
  if (filterFrom) where.push(gte(auditLog.createdAt, new Date(filterFrom)));
  if (filterTo) {
    // Inclusive end-of-day
    const endDate = new Date(filterTo);
    endDate.setHours(23, 59, 59, 999);
    where.push(lte(auditLog.createdAt, endDate));
  }
  if (filterQ) where.push(ilike(auditLog.detail, `%${filterQ.replace(/[%_]/g, '\\$&')}%`));

  const entries = await db
    .select()
    .from(auditLog)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(300);

  // For the member filter dropdown — all members
  const allMembers = await db
    .select({ id: members.id, nameEn: members.nameEn, nameUr: members.nameUr })
    .from(members)
    .orderBy(members.nameEn);

  const memberIds = [...new Set([
    ...entries.map((e) => e.actorId).filter((v): v is string => !!v),
    ...entries.map((e) => e.targetId).filter((v): v is string => !!v),
  ])];
  const referencedMembers = memberIds.length > 0
    ? await db.select().from(members).where(inArray(members.id, memberIds))
    : [];
  const memById = new Map(referencedMembers.map((m) => [m.id, m]));

  const filtersActive = Boolean(filterAction || filterMemberId || filterFrom || filterTo || filterQ);

  // Build the export URL with same filters so admin can CSV the filtered view
  const exportParams = new URLSearchParams();
  if (filterAction) exportParams.set('action', filterAction);
  if (filterMemberId) exportParams.set('member', filterMemberId);
  if (filterFrom) exportParams.set('from', filterFrom);
  if (filterTo) exportParams.set('to', filterTo);
  if (filterQ) exportParams.set('q', filterQ);
  const exportHref = `/api/exports/audit${exportParams.toString() ? `?${exportParams}` : ''}`;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">آڈٹ لاگ</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Tamper-evident activity journal · INSERT-only at DB layer</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-[var(--color-gold-4)]">Showing {entries.length} entries {filtersActive && '(filtered)'}</div>
          <ExportLink href={exportHref as any}>Export CSV</ExportLink>
        </div>
      </header>

      <Card className="mb-4">
        <CardHeader><CardTitle>🔍 Filters</CardTitle></CardHeader>
        <CardBody>
          <form method="get" className="grid gap-3 md:grid-cols-5">
            <label className="block">
              <span className="mb-1 block font-[var(--font-display)] text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">Action</span>
              <select name="action" defaultValue={filterAction} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-2 py-1.5 text-sm text-[var(--color-cream)]">
                {ACTION_GROUPS.map((opt, i) => (
                  <option key={i} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-[var(--font-display)] text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">Member</span>
              <select name="member" defaultValue={filterMemberId} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-2 py-1.5 text-sm text-[var(--color-cream)]">
                <option value="">— Any member —</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.nameEn || m.nameUr}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-[var(--font-display)] text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">From</span>
              <input type="date" name="from" defaultValue={filterFrom} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-2 py-1.5 text-sm text-[var(--color-cream)]" />
            </label>
            <label className="block">
              <span className="mb-1 block font-[var(--font-display)] text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">To</span>
              <input type="date" name="to" defaultValue={filterTo} className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-2 py-1.5 text-sm text-[var(--color-cream)]" />
            </label>
            <label className="block">
              <span className="mb-1 block font-[var(--font-display)] text-[10px] uppercase tracking-widest text-[var(--color-gold-4)]">Search detail</span>
              <input type="text" name="q" defaultValue={filterQ} placeholder="e.g. 1000" className="w-full rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-2 py-1.5 text-sm text-[var(--color-cream)]" />
            </label>
            <div className="flex items-center gap-2 md:col-span-5">
              <button type="submit" className="rounded-md bg-[var(--color-gold)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] hover:bg-[var(--color-gold-2)]">Apply</button>
              {filtersActive && (
                <a href="/admin/audit" className="rounded-md border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--color-gold-4)] hover:bg-[rgba(214,210,199,0.06)]">Clear</a>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardBody className="p-0">
          {entries.length === 0 && (
            <div className="py-10 text-center italic text-[var(--txt-3)]">
              {filtersActive ? 'No entries match your filters.' : 'No audit entries yet — every action will be logged here automatically.'}
            </div>
          )}
          {entries.map((e) => {
            const actor = e.actorId ? memById.get(e.actorId) : null;
            const target = e.targetId ? memById.get(e.targetId) : null;
            const icon = ICONS[e.action] || '•';
            const dt = new Date(e.createdAt);
            return (
              <div key={e.id} className="flex items-center gap-3 border-b border-[rgba(214,210,199,0.06)] px-4 py-3">
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

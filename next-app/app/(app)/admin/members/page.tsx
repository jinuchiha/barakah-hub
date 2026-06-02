import { redirect } from 'next/navigation';
import { asc, ne, eq } from 'drizzle-orm';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { StatCard } from '@/components/stat-card';
import { ini } from '@/lib/utils';
import MembersTable from './members-table';
import ApproveButton from './approve-button';
import BulkImportDialog from './bulk-import-dialog';
import { ExportLink } from '@/components/export-link';

export const metadata = { title: 'Members · Barakah Hub' };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ showRejected?: string }>;
}) {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const { showRejected } = await searchParams;
  const includeRejected = showRejected === '1';

  let all: typeof members.$inferSelect[] = [];
  let dbError: string | null = null;
  try {
    all = await db
      .select()
      .from(members)
      .where(includeRejected ? undefined : ne(members.status, 'rejected'))
      .orderBy(asc(members.nameEn));
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'Database error';
  }

  const pending  = all.filter((m) => m.status === 'pending');
  const approved = all.filter((m) => m.status === 'approved' && !m.deceased);
  const total    = all.filter((m) => m.status !== 'rejected');

  return (
    <div className="mx-auto max-w-[1400px]">
      {dbError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/8 px-5 py-4 text-sm text-red-300">
          <strong>Database error:</strong> Schema may be out of date — run pending migrations.
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-1 font-mono text-xs opacity-75">{dbError}</p>
          )}
        </div>
      )}

      {/* ── Page header ── */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">
            Admin · Members
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">
            Family Members
          </h1>
          <p className="font-[var(--font-arabic)] mt-1 text-sm text-[var(--color-gold-2)]">اراکین خاندان</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={includeRejected ? '/admin/members' : '/admin/members?showRejected=1'}
            className="rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-xs font-medium text-[var(--txt-2)] transition-colors hover:border-[var(--color-gold)]/30 hover:text-[var(--color-cream)]"
          >
            {includeRejected ? 'Hide rejected' : 'Show rejected'}
          </a>
          <BulkImportDialog />
          <ExportLink href={'/api/exports/members' as any}>Export CSV</ExportLink>
        </div>
      </header>

      {/* ── Stats row ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Members"  value={total.length}    icon={<Users />}     tone="sapphire" />
        <StatCard label="Active"         value={approved.length} icon={<UserCheck />} tone="emerald"  />
        <StatCard label="Pending Review" value={pending.length}  icon={<Clock />}     tone="gold"     hint={pending.length > 0 ? 'Requires approval' : 'All clear'} />
        <StatCard label="Rejected"       value={includeRejected ? all.filter((m) => m.status === 'rejected').length : '—'} icon={<UserX />} tone="ruby" />
      </div>

      {/* ── Pending approvals queue ── */}
      {pending.length > 0 && (
        <Card className="mb-6" style={{ borderColor: 'rgba(200,155,60,0.25)' }}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div
                className="grid size-7 shrink-0 place-items-center rounded-lg [&>svg]:size-3.5"
                style={{ background: 'rgba(200,155,60,0.12)', color: '#c89b3c', border: '1px solid rgba(200,155,60,0.2)' }}
              >
                <Clock />
              </div>
              <CardTitle>Pending Registrations</CardTitle>
            </div>
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ borderColor: 'rgba(200,155,60,0.3)', background: 'rgba(200,155,60,0.08)', color: '#c89b3c' }}
            >
              {pending.length} waiting
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {pending.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-b-0 hover:bg-[var(--surf-3)] transition-colors"
              >
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ background: m.color || '#888' }}
                >
                  {ini(m.nameEn || m.nameUr)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-[var(--color-cream)]">
                    {m.nameUr || m.nameEn}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--txt-3)]">
                    {m.fatherName && m.fatherName !== '—' ? `Son of ${m.fatherName}` : ''}
                    {m.relation ? ` · ${m.relation}` : ''}
                    {m.city ? ` · ${m.city}` : ''}
                  </div>
                </div>
                <ApproveButton memberId={m.id} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* ── Full members table ── */}
      <MembersTable initial={all} />
    </div>
  );
}

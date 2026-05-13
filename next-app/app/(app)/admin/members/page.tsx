import { redirect } from 'next/navigation';
import { asc, ne } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { ini } from '@/lib/utils';
import MembersTable from './members-table';
import ApproveButton from './approve-button';
import BulkImportDialog from './bulk-import-dialog';
import { ExportLink } from '@/components/export-link';

export const metadata = { title: 'Members · Barakah Hub' };

/**
 * Admin Members page.
 *
 * `?showRejected=1` opens the rejected-accounts view (separate query so
 * the default page-load stays clean — admins reported rejected entries
 * polluting the directory). Rejected rows are otherwise filtered out
 * server-side so they never appear in tables, WhatsApp lookups, etc.
 */
export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ showRejected?: string }>;
}) {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const { showRejected } = await searchParams;
  const includeRejected = showRejected === '1';

  const all = await db
    .select()
    .from(members)
    .where(includeRejected ? undefined : ne(members.status, 'rejected'))
    .orderBy(asc(members.nameEn));
  const pending = all.filter((m) => m.status === 'pending');

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">اراکین خاندان</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Family Members</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={includeRejected ? '/admin/members' : '/admin/members?showRejected=1'}
            className="rounded-md border border-[var(--border)] bg-[var(--surf-3)] px-3 py-1.5 text-xs font-medium text-[var(--txt-2)] transition-colors hover:border-[var(--border-2)] hover:text-[var(--color-cream)]"
          >
            {includeRejected ? 'Hide rejected' : 'Show rejected'}
          </a>
          <BulkImportDialog />
          <ExportLink href={'/api/exports/members' as any}>Export CSV</ExportLink>
        </div>
      </header>

      {pending.length > 0 && (
        <Card className="mb-4 border-[var(--color-gold)]/40">
          <CardHeader><CardTitle>⏳ Pending Registrations ({pending.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {pending.map((m) => (
              <div key={m.id} className="flex items-center gap-3 border-b border-[var(--border)] p-3">
                <div className="grid size-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: m.color }}>
                  {ini(m.nameEn || m.nameUr)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-cream)]">{m.nameUr || m.nameEn}</div>
                  <div className="text-xs text-[var(--txt-3)]">
                    Father: {m.fatherName} · {m.relation || '—'}
                    {m.city && ` · ${m.city}`}
                  </div>
                </div>
                <ApproveButton memberId={m.id} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <MembersTable initial={all} />
    </div>
  );
}

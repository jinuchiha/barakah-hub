import { eq, desc, inArray } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, cases, votes, config as configTbl } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Breadcrumb } from '@/components/breadcrumb';
import { fmtRs } from '@/lib/i18n/dict';
import VoteButtons from './vote-buttons';
import DisburseButton from './disburse-button';
import NewCaseForm from './new-case-form';
import { AdminCaseActions } from './admin-actions';

export const metadata = { title: 'Emergency Cases · Barakah Hub' };

export default async function CasesPage() {
  const me = await getMeOrRedirect();
  const isAdmin = me.role === 'admin';

  const [allCases, allMembers, [cfg]] = await Promise.all([
    db.select().from(cases).orderBy(desc(cases.createdAt)).limit(50),
    db.select().from(members).where(eq(members.deceased, false)),
    db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1),
  ]);

  const caseIds = allCases.map((c) => c.id);
  const allVotes = caseIds.length > 0
    ? await db.select().from(votes).where(inArray(votes.caseId, caseIds))
    : [];

  const memById = new Map(allMembers.map((m) => [m.id, m]));
  const eligibleCount = Math.max(0, allMembers.filter((m) => m.status === 'approved').length - 1);
  const voteThresh = cfg?.voteThresholdPct ?? 50;
  const need = Math.ceil(eligibleCount * (voteThresh / 100));

  return (
    <div className="mx-auto max-w-[1400px]">
      <Breadcrumb crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Emergency Votes' }]} />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-3)]">
            Community · Emergency Fund
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">
            Emergency Votes
          </h1>
          <p className="font-[var(--font-arabic)] mt-1 text-sm text-[var(--color-gold-2)]">ایمرجنسی ووٹ</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {allCases.filter((c) => c.status === 'voting').length > 0 && (
            <span
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ borderColor: 'rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.08)', color: '#fb923c' }}
            >
              {allCases.filter((c) => c.status === 'voting').length} open
            </span>
          )}
          <span
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
            style={{ borderColor: 'rgba(45,138,95,0.3)', background: 'rgba(45,138,95,0.08)', color: '#4ec38d' }}
          >
            {allCases.filter((c) => c.status === 'approved' || c.status === 'disbursed').length} approved
          </span>
        </div>
      </header>

      {me.status === 'approved' && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Submit New Request</CardTitle></CardHeader>
          <CardBody><NewCaseForm /></CardBody>
        </Card>
      )}

      <div className="space-y-3">
        {allCases.length === 0 && (
          <Card><CardBody className="py-10 text-center text-sm italic text-[var(--txt-3)]">الحمدللہ · اس وقت سب خیریت ہے · No emergency cases yet</CardBody></Card>
        )}
        {allCases.map((c) => {
          const applicant = memById.get(c.applicantId);
          const myVote = allVotes.find((v) => v.caseId === c.id && v.memberId === me.id);
          const yes = allVotes.filter((v) => v.caseId === c.id && v.vote).length;
          const pct = eligibleCount > 0 ? Math.round((yes / eligibleCount) * 100) : 0;
          return (
            <Card key={c.id} className={c.emergency ? 'border-l-4 border-l-red-500' : ''}>
              <CardBody>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[rgba(214,210,199,0.15)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-gold)]">{c.caseType}</span>
                      <span className="rounded-full bg-[rgba(30,42,74,0.12)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-emerald-2)]">{c.pool}</span>
                      <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase text-[var(--txt-2)]">{c.category}</span>
                      {c.emergency && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">EMERGENCY</span>}
                    </div>
                    <div className="text-base font-semibold text-[var(--color-cream)]">For: {c.beneficiaryName}</div>
                    <div className="text-xs text-[var(--txt-3)]">By: {applicant?.nameEn || applicant?.nameUr || 'Member'}{c.city ? ` · ${c.city}` : ''}</div>
                    <p className="mt-2 text-sm text-[var(--txt-2)]">{c.reasonEn}</p>
                    <p dir="rtl" className="font-[var(--font-arabic)] text-sm text-[var(--txt-2)]">{c.reasonUr}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-[var(--font-display)] text-xl font-bold text-[var(--color-gold)]">{fmtRs(c.amount)}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      c.status === 'approved' ? 'bg-[rgba(30,42,74,0.2)] text-[var(--color-emerald-2)]'
                      : c.status === 'rejected' ? 'bg-red-500/15 text-red-400'
                      : 'bg-[rgba(59,130,246,0.15)] text-blue-400'
                    }`}>{c.status === 'voting' ? 'Voting Open' : c.status}</span>
                  </div>
                </div>
                {c.status === 'voting' && (
                  <>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="font-[var(--font-en)] text-xs text-[var(--color-gold-4)]">{yes}/{eligibleCount} votes</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/20">
                        <div className="h-full bg-gradient-to-r from-[var(--color-emerald-2)] to-[var(--color-gold)]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-[var(--font-en)] text-xs text-[var(--color-gold-4)]">{pct}%</span>
                    </div>
                    <div className="mb-2 text-xs italic text-[var(--color-gold-4)]">Needed: {need} of {eligibleCount} ({voteThresh}%)</div>
                    {/* Anyone other than the applicant can vote. Admins are
                        ALSO allowed to vote on their own request (server
                        action enforces this). */}
                    {(c.applicantId !== me.id || isAdmin) && (
                      <VoteButtons caseId={c.id} alreadyVoted={!!myVote} />
                    )}
                    {c.applicantId === me.id && !isAdmin && (
                      <div className="text-xs italic text-[var(--txt-3)]">Your own request · cannot self-vote.</div>
                    )}
                  </>
                )}
                {c.status === 'approved' && isAdmin && (
                  <div className="mt-2">
                    <DisburseButton caseId={c.id} />
                  </div>
                )}
                {isAdmin && c.status !== 'disbursed' && (
                  <AdminCaseActions
                    caseId={c.id}
                    status={c.status}
                    beneficiary={c.beneficiaryName}
                  />
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { eq, desc, asc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, cases, votes, config as configTbl } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';
import { ini } from '@/lib/utils';
import VoteButtons from './vote-buttons';
import NewCaseForm from './new-case-form';

export const metadata = { title: 'Emergency Cases · BalochSath' };

export default async function CasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [me] = await db.select().from(members).where(eq(members.authId, user!.id)).limit(1);

  const [allCases, allMembers, allVotes, [cfg]] = await Promise.all([
    db.select().from(cases).orderBy(desc(cases.createdAt)).limit(50),
    db.select().from(members).where(eq(members.deceased, false)),
    db.select().from(votes),
    db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1),
  ]);
  const memById = new Map(allMembers.map((m) => [m.id, m]));
  const eligibleCount = Math.max(0, allMembers.filter((m) => m.status === 'approved').length - 1);
  const voteThresh = cfg?.voteThresholdPct ?? 50;
  const need = Math.ceil(eligibleCount * (voteThresh / 100));

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">ایمرجنسی ووٹ</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Emergency cases — community-approved by majority vote</p>
        </div>
      </header>

      {me.status === 'approved' && (
        <Card className="mb-4">
          <CardHeader><CardTitle>+ Submit New Request</CardTitle></CardHeader>
          <CardBody><NewCaseForm /></CardBody>
        </Card>
      )}

      <div className="space-y-3">
        {allCases.length === 0 && (
          <Card><CardBody className="py-10 text-center text-sm italic text-[var(--txt-3)]">الحمدللہ — اس وقت سب خیریت ہے · No emergency cases yet</CardBody></Card>
        )}
        {allCases.map((c) => {
          const applicant = memById.get(c.applicantId);
          const myVote = allVotes.find((v) => v.caseId === c.id && v.memberId === me.id);
          const yes = allVotes.filter((v) => v.caseId === c.id && v.vote).length;
          const no = allVotes.filter((v) => v.caseId === c.id && !v.vote).length;
          const pct = eligibleCount > 0 ? Math.round((yes / eligibleCount) * 100) : 0;
          return (
            <Card key={c.id} className={c.emergency ? 'border-l-4 border-l-red-500' : ''}>
              <CardBody>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[rgba(201,168,76,0.15)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--color-gold)]">{c.caseType}</span>
                      <span className="rounded-full bg-[rgba(31,110,74,0.12)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-emerald-2)]">{c.pool}</span>
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
                      c.status === 'approved' ? 'bg-[rgba(31,110,74,0.2)] text-[var(--color-emerald-2)]'
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
                    {c.applicantId !== me.id && (
                      <VoteButtons caseId={c.id} alreadyVoted={!!myVote} />
                    )}
                    {c.applicantId === me.id && <div className="text-xs italic text-[var(--txt-3)]">Your own request — cannot self-vote.</div>}
                  </>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

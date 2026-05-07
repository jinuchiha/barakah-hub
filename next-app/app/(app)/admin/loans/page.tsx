import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, loans } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { fmtRs } from '@/lib/i18n/dict';

export const metadata = { title: 'Qarz-e-Hasana · BalochSath' };

export default async function LoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [me] = await db.select().from(members).where(eq(members.authId, user!.id)).limit(1);
  if (me.role !== 'admin') redirect('/dashboard');

  const all = await db.select().from(loans).orderBy(desc(loans.issuedOn));
  const allMembers = await db.select().from(members);
  const memById = new Map(allMembers.map((m) => [m.id, m]));

  const active = all.filter((l) => l.active);
  const repaid = all.filter((l) => !l.active);
  const outstanding = active.reduce((a, l) => a + (l.amount - l.paid), 0);

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">قرض حسنہ</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Interest-free loans · {active.length} active · {fmtRs(outstanding)} outstanding</p>
      </header>

      <Card className="mb-4">
        <CardHeader><CardTitle>Active Qarz</CardTitle></CardHeader>
        <CardBody className="p-0">
          {active.length === 0 && (
            <div className="py-12 text-center text-sm italic text-[var(--txt-3)]">No active qarz · No outstanding loans</div>
          )}
          {active.map((l) => {
            const m = memById.get(l.memberId);
            const remaining = l.amount - l.paid;
            const pct = Math.round((l.paid / l.amount) * 100);
            return (
              <div key={l.id} className="border-b border-[rgba(201,168,76,0.06)] p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-cream)]">{m?.nameEn || m?.nameUr}</div>
                    <div className="mt-0.5 text-xs text-[var(--txt-3)]">{l.purpose}</div>
                    <div className="mt-1 text-[10px] text-[var(--color-gold-4)]">
                      Issued {new Date(l.issuedOn).toLocaleDateString('en-GB')}
                      {l.expectedReturn && ` · Return by ${new Date(l.expectedReturn).toLocaleDateString('en-GB')}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-[var(--font-display)] text-lg text-[var(--color-gold)]">{fmtRs(remaining)}</div>
                    <div className="text-[10px] text-[var(--color-gold-4)]">remaining</div>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
                  <div className="h-full bg-gradient-to-r from-[var(--color-emerald-2)] to-[var(--color-gold)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 font-[var(--font-en)] text-[10px] text-[var(--color-gold-4)]">
                  {fmtRs(l.paid)} repaid of {fmtRs(l.amount)} ({pct}%)
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {repaid.length > 0 && (
        <Card>
          <CardHeader><CardTitle>✓ Fully Repaid ({repaid.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {repaid.map((l) => {
              const m = memById.get(l.memberId);
              return (
                <div key={l.id} className="flex items-center justify-between border-b border-[rgba(201,168,76,0.06)] px-4 py-2.5">
                  <span className="text-sm text-[var(--txt-2)]">{m?.nameEn || m?.nameUr} · {l.purpose}</span>
                  <span className="font-[var(--font-display)] text-sm text-[var(--color-emerald-2)]">{fmtRs(l.amount)} ✓</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

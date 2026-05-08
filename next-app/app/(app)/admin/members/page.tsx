import { redirect } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { ini } from '@/lib/utils';
import MembersTable from './members-table';
import ApproveButton from './approve-button';

export const metadata = { title: 'Members · Barakah Hub' };

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [me] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!me) redirect('/onboarding');
  if (me.role !== 'admin') redirect('/dashboard');

  const all = await db.select().from(members).orderBy(asc(members.nameEn));
  const pending = all.filter((m) => m.status === 'pending');

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">اراکین خاندان</h1>
          <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Family Members</p>
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

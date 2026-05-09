import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import BroadcastForm from './broadcast-form';

export const metadata = { title: 'Broadcast · Barakah Hub' };

export default async function BroadcastPage() {
  const me = await getMeOrRedirect();
  if (me.role !== 'admin') redirect('/dashboard');

  const recipientCount = await db.$count(members, eq(members.deceased, false));

  return (
    <div className="max-w-2xl">
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">اعلان</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Broadcast — sends a notification to all {recipientCount} family members</p>
      </header>

      <Card>
        <CardHeader><CardTitle>📢 Compose</CardTitle></CardHeader>
        <CardBody><BroadcastForm /></CardBody>
      </Card>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { members, config as configTbl } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import ProfileForm from './profile-form';
import ThemePicker from './theme-picker';
import AdminConfigForm from './admin-config-form';

export const metadata = { title: 'Settings · Barakah Hub' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [me] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (!me) redirect('/onboarding');
  const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
  const isAdmin = me.role === 'admin';

  return (
    <div className="max-w-2xl">
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">ترتیبات</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Settings & Preferences</p>
      </header>

      <Card className="mb-4">
        <CardHeader><CardTitle>👤 My Profile</CardTitle></CardHeader>
        <CardBody><ProfileForm member={me} /></CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>🎨 Theme & Appearance</CardTitle></CardHeader>
        <CardBody><ThemePicker initial={cfg.themePalette} canSave={isAdmin} /></CardBody>
      </Card>

      {isAdmin && (
        <Card className="mb-4">
          <CardHeader><CardTitle>⚙️ Admin Configuration</CardTitle></CardHeader>
          <CardBody><AdminConfigForm config={cfg} /></CardBody>
        </Card>
      )}
    </div>
  );
}

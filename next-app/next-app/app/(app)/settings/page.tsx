import { eq } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { config as configTbl } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import ProfileForm from './profile-form';
import ThemePicker from './theme-picker';
import AdminConfigForm from './admin-config-form';

export const metadata = { title: 'Settings · Barakah Hub' };

export default async function SettingsPage() {
  const me = await getMeOrRedirect();
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
        <CardBody><ThemePicker initial={cfg?.themePalette ?? 'gold'} canSave={isAdmin} /></CardBody>
      </Card>

      {isAdmin && cfg && (
        <Card className="mb-4">
          <CardHeader><CardTitle>⚙️ Admin Configuration</CardTitle></CardHeader>
          <CardBody><AdminConfigForm config={cfg} /></CardBody>
        </Card>
      )}
    </div>
  );
}

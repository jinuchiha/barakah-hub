import { eq } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { config as configTbl } from '@/lib/db/schema';
import WhatsAppTestButton from './whatsapp-test-button';
import ProfileForm from './profile-form';
import ThemePicker from './theme-picker';
import AdminConfigForm from './admin-config-form';
import { AdminSectionCard } from './admin-section-card';

export const metadata = { title: 'Settings · Barakah Hub' };

export default async function SettingsPage() {
  const me = await getMeOrRedirect();
  const [cfg] = await db.select().from(configTbl).where(eq(configTbl.id, 1)).limit(1);
  const isAdmin = me.role === 'admin';

  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-[1400px]">
      <header className="mb-8 border-b border-[var(--border)] pb-5">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">ترتیبات</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Settings & Preferences</p>
      </header>

      {/* One continuous section grid — profile, family, contact, appearance,
          and (admin-only) configuration all share the same card language,
          gap rhythm, and mini-nav. */}
      <ProfileForm member={me} isAdmin={isAdmin} appearance={<ThemePicker />}>
        {isAdmin && (
          <div className="mt-4">
            <AdminSectionCard action={<WhatsAppTestButton />}>
              <AdminConfigForm config={cfg ?? { id: 1, voteThresholdPct: 50, defaultMonthlyPledge: 1000, fautiAmount: 0, goalAmount: 0, goalLabelUr: null, goalLabelEn: null, goalDeadline: null, themePalette: 'gold', orgNameUr: 'بَرَكَة ہب', orgNameEn: 'Barakah Hub', easyPaiseName: null, easyPaiseNumber: null, updatedAt: new Date() }} />
            </AdminSectionCard>
          </div>
        )}
      </ProfileForm>
    </div>
  );
}

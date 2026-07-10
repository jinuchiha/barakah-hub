export const dynamic = 'force-dynamic';

import { and, eq } from 'drizzle-orm';
import { getMeOrRedirect } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { formatHijriDate } from '@/lib/hijri';
import { getDailyVerse } from '@/lib/quran';
import { t } from '@/lib/i18n/dict';
import { getLocale } from '@/lib/i18n/server';
import ZakatCalc from './zakat-calc';
import FitranaCalc from './fitrana-calc';
import QiblaCompass from './qibla-compass';
import TasbeehCounter from './tasbeeh-counter';
import { PrayerTimesCard } from '@/components/prayer-times-card';

export const metadata = { title: 'Islamic Tools · Barakah Hub' };

export default async function ToolsPage() {
  await getMeOrRedirect();
  const locale = await getLocale();

  const today = new Date();
  const hijriDate = formatHijriDate(today);
  const verse = getDailyVerse();
  // Living approved family members — the "whole family" quick-set in Fitrana.
  const familyCount = await db.$count(members, and(eq(members.status, 'approved'), eq(members.deceased, false)));

  return (
    <div className="mx-auto w-full max-w-4xl lg:max-w-6xl">
      <header className="mb-8 border-b border-[var(--border)] pb-5">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">اسلامی ٹولز</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Islamic Tools</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Hijri Date */}
        <Card>
          <CardHeader>
            <CardTitle>{t('tools.hijri', locale)}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-xs text-[var(--txt-3)]">{t('tools.hijriSub', locale)}</div>
            <div className="mt-2 font-[var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
              {hijriDate}
            </div>
            <div className="mt-1 text-xs text-[var(--txt-4)]">
              {today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </CardBody>
        </Card>

        {/* Prayer Times — computed locally, live next-prayer countdown */}
        <Card className="sm:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('tools.prayer', locale)} · اوقاتِ نماز</CardTitle>
          </CardHeader>
          <CardBody>
            <PrayerTimesCard />
          </CardBody>
        </Card>

        {/* Zakat Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>{t('tools.zakat', locale)}</CardTitle>
          </CardHeader>
          <CardBody>
            <ZakatCalc />
          </CardBody>
        </Card>

        {/* Fitrana Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>{t('tools.fitrana', locale)}</CardTitle>
          </CardHeader>
          <CardBody>
            <FitranaCalc familyCount={familyCount} />
          </CardBody>
        </Card>

        {/* Qibla Direction */}
        <Card>
          <CardHeader>
            <CardTitle>{t('tools.qibla', locale)}</CardTitle>
          </CardHeader>
          <CardBody>
            <QiblaCompass />
          </CardBody>
        </Card>

        {/* Tasbeeh Counter */}
        <Card>
          <CardHeader>
            <CardTitle>{t('tools.tasbeeh', locale)}</CardTitle>
          </CardHeader>
          <CardBody>
            <TasbeehCounter />
          </CardBody>
        </Card>

        {/* Daily Verse */}
        <Card>
          <CardHeader>
            <CardTitle>{t('tools.verse', locale)}</CardTitle>
          </CardHeader>
          <CardBody>
            <div
              dir="rtl"
              className="mb-3 font-[var(--font-arabic)] text-xl leading-relaxed text-[var(--color-gold-2)]"
            >
              {verse.arabic}
            </div>
            <p className="mb-2 text-sm italic text-[var(--txt-2)]">&ldquo;{verse.english}&rdquo;</p>
            <div className="text-xs text-[var(--color-gold-4)]">{verse.reference}</div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

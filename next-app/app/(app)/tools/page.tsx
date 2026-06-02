export const dynamic = 'force-dynamic';

import { getMeOrRedirect } from '@/lib/auth-server';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { formatHijriDate } from '@/lib/hijri';
import { getDailyVerse } from '@/lib/quran';
import ZakatCalc from './zakat-calc';

export const metadata = { title: 'Islamic Tools — Barakah Hub' };

export default async function ToolsPage() {
  await getMeOrRedirect();

  const today = new Date();
  const hijriDate = formatHijriDate(today);
  const verse = getDailyVerse();

  return (
    <div>
      <header className="mb-6 border-b border-[var(--border)] pb-4">
        <h1 className="font-[var(--font-arabic)] text-3xl text-[var(--color-gold-2)]">اسلامی ٹولز</h1>
        <p className="mt-1 font-[var(--font-en)] text-sm italic text-[var(--color-gold-4)]">Islamic Tools</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Hijri Date */}
        <Card>
          <CardHeader>
            <CardTitle>Hijri Date</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="text-xs text-[var(--txt-3)]">Today in the Islamic calendar</div>
            <div className="mt-2 font-[var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
              {hijriDate}
            </div>
            <div className="mt-1 text-xs text-[var(--txt-4)]">
              {today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </CardBody>
        </Card>

        {/* Prayer Times */}
        <Card>
          <CardHeader>
            <CardTitle>Prayer Times</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-sm text-[var(--txt-2)]">
              Accurate prayer times based on your location.
            </p>
            <a
              href="https://salahtimes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[rgba(200,155,60,0.12)] px-3 py-2 text-sm text-[var(--color-gold)] transition-colors hover:bg-[rgba(200,155,60,0.2)]"
            >
              Open Salah Times ↗
            </a>
            <div className="mt-3 text-xs text-[var(--txt-4)]">
              Full prayer times with Adhan notifications available in the Barakah Hub mobile app.
            </div>
          </CardBody>
        </Card>

        {/* Zakat Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>Zakat Calculator</CardTitle>
          </CardHeader>
          <CardBody>
            <ZakatCalc />
          </CardBody>
        </Card>

        {/* Daily Verse */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Verse</CardTitle>
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

/**
 * Lightweight Hijri (Islamic) year converter.
 *
 * Uses the Umm al-Qura tabular calculation — accurate to ±1 day vs the
 * astronomical calendar. Good enough for annual reports. For prayer
 * times you'd want the real lunar calculation.
 */

/** Umm al-Qura via Intl — the engine's calendar data, not hand-rolled math. */
const HIJRI_FMT = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function hijriParts(date: Date): { year: number; month: string; day: number } {
  const parts = HIJRI_FMT.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: parseInt(get('year'), 10), month: get('month'), day: parseInt(get('day'), 10) };
}

export function gregorianToHijriYear(date: Date): number {
  return hijriParts(date).year;
}

const DAY_MS = 86_400_000;
const MEAN_HIJRI_YEAR_DAYS = 354.36706;
const HIJRI_EPOCH_UTC = Date.UTC(622, 6, 16); // 16 July 622 CE

/** First Gregorian day of a Hijri year — approximate, then walk to the
 * exact boundary using the same Intl calendar the display uses. */
function firstDayOfHijriYear(hYear: number): Date {
  let d = new Date(HIJRI_EPOCH_UTC + Math.round((hYear - 1) * MEAN_HIJRI_YEAR_DAYS * DAY_MS));
  while (gregorianToHijriYear(d) >= hYear) d = new Date(d.getTime() - DAY_MS);
  while (gregorianToHijriYear(d) < hYear) d = new Date(d.getTime() + DAY_MS);
  return d;
}

/**
 * First & last Gregorian dates that fall inside a given Hijri year.
 * Used for "filter all payments in 1446 AH" style queries.
 */
export function hijriYearRange(hYear: number): { from: Date; to: Date } {
  const from = firstDayOfHijriYear(hYear);
  const to = new Date(firstDayOfHijriYear(hYear + 1).getTime() - DAY_MS);
  return { from, to };
}

export function formatHijriDate(date: Date): string {
  const h = hijriParts(date);
  return `${h.day} ${h.month} ${h.year} AH`;
}

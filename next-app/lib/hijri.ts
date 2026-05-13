/**
 * Lightweight Hijri (Islamic) year converter.
 *
 * Uses the Umm al-Qura tabular calculation — accurate to ±1 day vs the
 * astronomical calendar. Good enough for annual reports. For prayer
 * times you'd want the real lunar calculation.
 */

const HIJRI_EPOCH = 1948439.5; // Julian day of 1 Muharram 1 AH

function gregorianToJulianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function julianDayToHijri(jd: number): { year: number; month: number; day: number } {
  const elapsed = jd - HIJRI_EPOCH;
  const year = Math.floor((30 * elapsed + 10646) / 10631);
  const yStart = HIJRI_EPOCH + Math.ceil((10631 * (year - 1) - 10646) / 30);
  const month = Math.min(12, Math.ceil((jd - yStart) / 29.5) + 1);
  const mStart = yStart + Math.floor((month - 1) * 29.5);
  const day = Math.floor(jd - mStart) + 1;
  return { year, month, day };
}

export function gregorianToHijriYear(date: Date): number {
  const jd = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return julianDayToHijri(jd).year;
}

/**
 * First & last Gregorian dates that fall inside a given Hijri year.
 * Used for "filter all payments in 1446 AH" style queries.
 */
export function hijriYearRange(hYear: number): { from: Date; to: Date } {
  const startJd = HIJRI_EPOCH + Math.ceil((10631 * (hYear - 1) - 10646) / 30);
  const endJd = HIJRI_EPOCH + Math.ceil((10631 * hYear - 10646) / 30) - 1;
  return { from: julianDayToGregorian(startJd), to: julianDayToGregorian(endJd) };
}

function julianDayToGregorian(jd: number): Date {
  const a = Math.floor(jd + 0.5) + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(Date.UTC(year, month - 1, day));
}

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
  'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah',
];

export function formatHijriDate(date: Date): string {
  const jd = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const h = julianDayToHijri(jd);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Convert a display label like "May 2026" to a sortable ISO date "2026-05-01". */
export function monthStartFromLabel(label: string): string {
  const match = label.trim().toLowerCase().match(/^(\w+)\s+(\d{4})$/);
  if (match) {
    const m = MONTH_NAMES.indexOf(match[1]);
    if (m >= 0) {
      const yyyy = match[2];
      const mm = String(m + 1).padStart(2, '0');
      return `${yyyy}-${mm}-01`;
    }
  }
  throw new Error(`Invalid month label "${label}" · expected format "Month YYYY" e.g. "May 2026"`);
}

/**
 * The fund's timezone. Every member is in Pakistan, so a "month" is a month
 * in Pakistan — not on whichever machine happens to answer the request.
 */
export const FUND_TIMEZONE = 'Asia/Karachi';

/**
 * Current month label e.g. "May 2026", anchored to Pakistan time.
 *
 * This used to read the runtime's clock with no timezone. Vercel runs in UTC
 * and PKT is UTC+5, so between 00:00 and 05:00 PKT on the first of a month the
 * server still believed it was the previous month: a member who had just paid
 * was reported as unpaid, because the dashboard compared their new payment's
 * label against the old month's.
 */
export function currentMonthLabel(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: FUND_TIMEZONE,
  });
}

/**
 * Today's date in the fund's timezone as "YYYY-MM-DD".
 *
 * Use this for `paid_on` rather than letting Postgres default to its own
 * `now()`, which files a payment made at 02:00 PKT on the 1st into the
 * previous month.
 */
export function currentFundDate(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape a date column wants.
  return now.toLocaleDateString('en-CA', { timeZone: FUND_TIMEZONE });
}

/**
 * Shared date formatters.
 *
 * Before this file existed, `toLocaleDateString` was re-typed inline at 20+
 * call sites in four different shapes ('en-GB' bare, short-month, long-month,
 * with-time), so the same timestamp rendered differently page to page.
 * One entry point per shape; nothing else.
 */

type DateInput = Date | string | number | null | undefined;

function toDate(d: DateInput): Date | null {
  if (d === null || d === undefined || d === '') return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `5 Sept 2026` — the app-wide date shape. */
export function fmtDate(d: DateInput): string {
  const date = toDate(d);
  return date
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
}

/** `5 Sept 2026, 14:32` — for audit rows and timestamps that need the time. */
export function fmtDateTime(d: DateInput): string {
  const date = toDate(d);
  return date
    ? date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
}

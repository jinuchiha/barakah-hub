const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** Convert a display label like "May 2026" to a sortable ISO date "2026-05-01".
 *  Returns first-of-current-month if the label can't be parsed. */
export function monthStartFromLabel(label: string, now: Date = new Date()): string {
  const match = label.trim().toLowerCase().match(/^(\w+)\s+(\d{4})$/);
  if (match) {
    const m = MONTH_NAMES.indexOf(match[1]);
    if (m >= 0) {
      const yyyy = match[2];
      const mm = String(m + 1).padStart(2, '0');
      return `${yyyy}-${mm}-01`;
    }
  }
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

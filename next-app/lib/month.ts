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
  throw new Error(`Invalid month label "${label}" — expected format "Month YYYY" e.g. "May 2026"`);
}

/** Returns current month label e.g. "May 2026" */
export function currentMonthLabel(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

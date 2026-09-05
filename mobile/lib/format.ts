export function formatPKR(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function formatPKRShort(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  if (n >= 1_000_000) return `₨${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `₨${Math.round(n / 1_000)}K`;
  return `₨${n}`;
}

/** Full number with commas, compact ₨ prefix — fits narrow StatCard cells. */
export function formatPKRFull(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `₨${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Date for display — locale-PROOF, never blank.
 *
 * toLocaleDateString('en-PK', …) returns an empty or wrong string on Android
 * builds whose ICU data lacks the locale, which rendered dates as blank on
 * real devices. Dates are money-audit data here; they are formatted by hand
 * ("05 Sep 2026") so every device shows the same thing.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  if (Number.isNaN(date)) return '—';
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#1a7a4a', '#2980b9', '#8e44ad', '#c0392b',
    '#d35400', '#16a085', '#2c3e50', '#7f8c8d',
  ];
  return colors[Math.abs(hash) % colors.length] ?? '#1a7a4a';
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * "September 2026" — hand-built for the same reason as formatDate: this
 * string is SUBMITTED with every payment (monthLabel), so a locale-dependent
 * blank here would corrupt payment data, not just display.
 */
export function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;
}

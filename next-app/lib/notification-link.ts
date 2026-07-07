/**
 * Map a notification `type` to the screen it is about, so tapping the
 * notification lands where the action is. Prefix matching because
 * reminder types carry a month suffix (e.g. `pledge-reminder:May 2026`).
 */
const RULES: [prefix: string, href: string][] = [
  ['payment-awaiting-admin', '/admin/fund'],
  ['payment-pending', '/admin/fund'],
  ['payment-approved', '/myaccount'],
  ['payment-verified', '/myaccount'],
  ['payment-rejected', '/myaccount'],
  ['pledge-reminder', '/myaccount'],
  ['loan-reminder', '/myaccount'],
  ['member-pending', '/admin/members'],
  ['approved', '/dashboard'],
  ['rejected', '/dashboard'],
  ['case', '/cases'],
  ['emergency', '/cases'],
  ['vote', '/cases'],
  ['message', '/messages'],
  ['msg', '/messages'],
  // 'broadcast' intentionally unmapped — no dedicated screen; the null
  // fallthrough keeps the user on /notifications, which is correct.
];

export function notificationHref(type: string | null): string | null {
  if (!type) return null;
  for (const [prefix, href] of RULES) {
    if (type.startsWith(prefix)) return href;
  }
  return null;
}

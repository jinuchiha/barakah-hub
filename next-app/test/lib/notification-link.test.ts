import { describe, it, expect } from 'vitest';
import { notificationHref } from '@/lib/notification-link';

/**
 * The map is prefix-ordered — 'payment-approved' MUST match before the
 * bare 'approved' rule, or admins get routed to the wrong screen. These
 * pin every type the server actually emits.
 */
describe('notificationHref — every emitted type lands on the right screen', () => {
  it.each([
    ['payment-pending', '/admin/fund'],
    ['payment-awaiting-admin', '/admin/fund'],
    ['payment-approved', '/myaccount'],
    ['payment-verified', '/myaccount'],
    ['payment-rejected', '/myaccount'],
    ['pledge-reminder:May 2026', '/myaccount'],
    ['loan-reminder:May 2026', '/myaccount'],
    ['member-pending', '/admin/members'],
    ['approved', '/dashboard'],
    ['rejected', '/dashboard'],
    ['case', '/cases'],
    ['emergency', '/cases'],
    ['vote-open', '/cases'],
    ['msg', '/messages'],
    ['message', '/messages'],
  ])('%s → %s', (type, href) => {
    expect(notificationHref(type)).toBe(href);
  });

  it('broadcast and unknown types fall through to null (stay on /notifications)', () => {
    expect(notificationHref('broadcast')).toBeNull();
    expect(notificationHref('something-new')).toBeNull();
    expect(notificationHref(null)).toBeNull();
  });
});

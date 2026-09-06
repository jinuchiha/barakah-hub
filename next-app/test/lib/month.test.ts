import { describe, it, expect } from 'vitest';
import { currentMonthLabel, currentFundDate, monthStartFromLabel } from '@/lib/month';

/**
 * The fund runs in Pakistan; the servers run in UTC. PKT is UTC+5, so for the
 * first five hours of every month the two disagree about which month it is.
 *
 * Before the timezone was made explicit, a member paying at 01:00 PKT on the
 * 1st had their payment labelled with the new month by their phone, while the
 * dashboard asked the server whether they had paid for the *previous* month
 * and answered no. Someone who had just paid was shown as unpaid.
 *
 * Every case below is a fixed instant, so this suite proves the behaviour
 * today rather than waiting for a real month boundary to come around.
 */
describe('currentMonthLabel — Pakistan month boundary', () => {
  it('reports the old month at 23:59 PKT on the last day', () => {
    // 18:59 UTC on 31 May === 23:59 PKT on 31 May
    expect(currentMonthLabel(new Date('2026-05-31T18:59:00Z'))).toBe('May 2026');
  });

  it('rolls over at 00:00 PKT even though UTC is still in the old month', () => {
    // 19:00 UTC on 31 May === 00:00 PKT on 1 June — this is the case that broke
    expect(currentMonthLabel(new Date('2026-05-31T19:00:00Z'))).toBe('June 2026');
  });

  it('stays in the new month at 04:59 PKT, the last minute UTC still disagrees', () => {
    // 23:59 UTC on 31 May === 04:59 PKT on 1 June
    expect(currentMonthLabel(new Date('2026-05-31T23:59:00Z'))).toBe('June 2026');
  });

  it('agrees with UTC from 05:00 PKT onwards', () => {
    // 00:00 UTC on 1 June === 05:00 PKT on 1 June
    expect(currentMonthLabel(new Date('2026-06-01T00:00:00Z'))).toBe('June 2026');
  });

  it('handles the December to January year rollover', () => {
    // 19:00 UTC on 31 Dec === 00:00 PKT on 1 Jan
    expect(currentMonthLabel(new Date('2026-12-31T19:00:00Z'))).toBe('January 2027');
  });
});

describe('currentFundDate', () => {
  it('returns the Pakistan calendar date, not the UTC one', () => {
    expect(currentFundDate(new Date('2026-05-31T19:00:00Z'))).toBe('2026-06-01');
    expect(currentFundDate(new Date('2026-05-31T18:59:00Z'))).toBe('2026-05-31');
  });

  it('produces a value a date column accepts', () => {
    expect(currentFundDate(new Date('2026-06-15T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('currentMonthLabel round-trips through monthStartFromLabel', () => {
  it('produces a label the parser accepts, at the boundary', () => {
    const label = currentMonthLabel(new Date('2026-05-31T19:00:00Z'));
    expect(monthStartFromLabel(label)).toBe('2026-06-01');
  });
});

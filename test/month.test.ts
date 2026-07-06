import { describe, it, expect } from 'vitest';
import { monthStartFromLabel } from '@/lib/month';

describe('monthStartFromLabel', () => {
  it('parses "May 2026"', () => {
    expect(monthStartFromLabel('May 2026')).toBe('2026-05-01');
  });
  it('is case-insensitive', () => {
    expect(monthStartFromLabel('MAY 2026')).toBe('2026-05-01');
    expect(monthStartFromLabel('may 2026')).toBe('2026-05-01');
  });
  it('handles leading/trailing whitespace', () => {
    expect(monthStartFromLabel('  March 2025  ')).toBe('2025-03-01');
  });
  it('zero-pads single-digit months', () => {
    expect(monthStartFromLabel('January 2026')).toBe('2026-01-01');
    expect(monthStartFromLabel('September 2026')).toBe('2026-09-01');
  });
  it('throws on unparsable labels instead of silently returning current month', () => {
    expect(() => monthStartFromLabel('not a month')).toThrow('Invalid month label');
    expect(() => monthStartFromLabel('')).toThrow('Invalid month label');
  });
  it('produces lexicographically sortable strings (the bug we fixed)', () => {
    // The original bug was sorting "April 2026" < "August 2026" < "December 2026" < "February 2026" …
    // which is alphabetical, not chronological.
    // ISO yyyy-mm-dd sorts correctly as text.
    const inputs = ['April 2026', 'August 2026', 'December 2026', 'February 2026', 'May 2026'];
    const sorted = inputs.map((l) => monthStartFromLabel(l)).sort();
    expect(sorted).toEqual([
      '2026-02-01', // February
      '2026-04-01', // April
      '2026-05-01', // May
      '2026-08-01', // August
      '2026-12-01', // December
    ]);
  });
});

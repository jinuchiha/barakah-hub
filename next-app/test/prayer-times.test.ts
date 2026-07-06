import { describe, it, expect } from 'vitest';
import { prayerTimesFor } from '@/lib/prayer-times';

/**
 * Islamabad, a fixed summer date. Times come back in the RUNTIME's local
 * timezone (CI runs UTC, dev machines run PKT), so every assertion here
 * is timezone-independent: ordering, spacing, and solar-noon derived
 * from the runtime offset — never wall-clock constants.
 */
const DATE = new Date(2026, 6, 6); // 6 July 2026 (local)
const LAT = 33.6844;
const LNG = 73.0479;

const hoursSinceLocalMidnight = (d: Date, day: Date) => {
  const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return (d.getTime() - midnight.getTime()) / 3_600_000;
};

describe('prayerTimesFor', () => {
  const t = prayerTimesFor(DATE, LAT, LNG);

  it('orders the five prayers correctly', () => {
    expect(t.fajr.getTime()).toBeLessThan(t.sunrise.getTime());
    expect(t.sunrise.getTime()).toBeLessThan(t.dhuhr.getTime());
    expect(t.dhuhr.getTime()).toBeLessThan(t.asr.getTime());
    expect(t.asr.getTime()).toBeLessThan(t.maghrib.getTime());
    expect(t.maghrib.getTime()).toBeLessThan(t.isha.getTime());
  });

  it('solar noon matches longitude + runtime timezone (±30 min for eqt)', () => {
    const tzHours = -DATE.getTimezoneOffset() / 60;
    const expectedNoon = 12 + tzHours - LNG / 15;
    expect(Math.abs(hoursSinceLocalMidnight(t.dhuhr, DATE) - expectedNoon)).toBeLessThan(0.5);
  });

  it('summer daylight in Islamabad is long', () => {
    const daylightHours = (t.maghrib.getTime() - t.sunrise.getTime()) / 3_600_000;
    expect(daylightHours).toBeGreaterThan(12);
    expect(daylightHours).toBeLessThan(16);
  });

  it('consecutive days shift by ~24h', () => {
    const next = prayerTimesFor(new Date(2026, 6, 7), LAT, LNG);
    const deltaMin = (next.dhuhr.getTime() - t.dhuhr.getTime()) / 60_000;
    expect(Math.abs(deltaMin - 24 * 60)).toBeLessThan(3);
  });
});

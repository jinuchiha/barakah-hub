import { describe, it, expect } from 'vitest';
import { prayerTimesFor } from '@/lib/prayer-times';

// Islamabad, a fixed summer date. We assert ordering and plausible local
// windows rather than exact minutes — the algorithm is ±2 min by design.
const DATE = new Date(2026, 6, 6); // 6 July 2026 (local)
const LAT = 33.6844;
const LNG = 73.0479;

describe('prayerTimesFor', () => {
  const t = prayerTimesFor(DATE, LAT, LNG);

  it('orders the five prayers correctly', () => {
    expect(t.fajr.getTime()).toBeLessThan(t.sunrise.getTime());
    expect(t.sunrise.getTime()).toBeLessThan(t.dhuhr.getTime());
    expect(t.dhuhr.getTime()).toBeLessThan(t.asr.getTime());
    expect(t.asr.getTime()).toBeLessThan(t.maghrib.getTime());
    expect(t.maghrib.getTime()).toBeLessThan(t.isha.getTime());
  });

  it('keeps every time on the requested calendar day', () => {
    for (const d of [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha]) {
      expect(d.getDate()).toBe(DATE.getDate());
      expect(d.getMonth()).toBe(DATE.getMonth());
    }
  });

  it('puts solar noon in a plausible midday window', () => {
    expect(t.dhuhr.getHours()).toBeGreaterThanOrEqual(11);
    expect(t.dhuhr.getHours()).toBeLessThanOrEqual(13);
  });

  it('summer daylight in Islamabad is long — maghrib well after asr', () => {
    const daylightHours = (t.maghrib.getTime() - t.sunrise.getTime()) / 3_600_000;
    expect(daylightHours).toBeGreaterThan(12);
    expect(daylightHours).toBeLessThan(16);
  });
});

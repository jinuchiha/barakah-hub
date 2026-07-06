'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { prayerTimesFor, type PrayerTimes } from '@/lib/prayer-times';

// Default location: Islamabad. Browser geolocation refines it if granted.
const FALLBACK = { lat: 33.6844, lng: 73.0479, label: 'Islamabad (default)' };

const PRAYERS: { key: keyof PrayerTimes; en: string; ur: string }[] = [
  { key: 'fajr', en: 'Fajr', ur: 'فجر' },
  { key: 'sunrise', en: 'Sunrise', ur: 'طلوع' },
  { key: 'dhuhr', en: 'Dhuhr', ur: 'ظہر' },
  { key: 'asr', en: 'Asr', ur: 'عصر' },
  { key: 'maghrib', en: 'Maghrib', ur: 'مغرب' },
  { key: 'isha', en: 'Isha', ur: 'عشاء' },
];

const fmt = (d: Date) =>
  d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

function nextPrayer(times: PrayerTimes, now: Date): { key: keyof PrayerTimes; at: Date } {
  for (const p of PRAYERS) {
    if (p.key !== 'sunrise' && times[p.key] > now) return { key: p.key, at: times[p.key] };
  }
  // Past Isha — next is tomorrow's Fajr (approximate with today's time + 24h).
  const t = new Date(times.fajr);
  t.setDate(t.getDate() + 1);
  return { key: 'fajr', at: t };
}

function countdown(to: Date, now: Date): string {
  const s = Math.max(0, Math.floor((to.getTime() - now.getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export function PrayerTimesCard() {
  const [loc, setLoc] = useState(FALLBACK);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    navigator.geolocation?.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'Your location' }),
      () => {},
      { timeout: 5000 },
    );
    return () => clearInterval(tick);
  }, []);

  // Recompute on day/location change only — not every tick.
  const dayKey = now.toDateString();
  const times = useMemo(
    () => prayerTimesFor(new Date(dayKey), loc.lat, loc.lng),
    [dayKey, loc.lat, loc.lng],
  );
  const next = nextPrayer(times, now);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--txt-4)]">
          <MapPin className="size-3" aria-hidden /> {loc.label} · Karachi method, Hanafi Asr
        </div>
        <div className="text-[11px] text-[var(--color-gold-4)]">
          Next in <span className="tabular font-semibold text-[var(--color-gold-2)]">{countdown(next.at, now)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PRAYERS.map((p) => {
          const active = p.key === next.key;
          return (
            <div
              key={p.key}
              className="relative rounded-xl border px-2 py-3 text-center transition-colors duration-300"
              style={{
                borderColor: active ? 'rgba(200,155,60,0.45)' : 'var(--border)',
                background: active ? 'rgba(200,155,60,0.08)' : 'transparent',
              }}
            >
              {active && (
                <motion.span
                  aria-hidden
                  className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-2)] to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
              <div className="font-[var(--font-arabic)] text-[13px] leading-6 text-[var(--color-gold-2)]">{p.ur}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--txt-4)]">{p.en}</div>
              <div className={`tabular mt-1 text-[12.5px] font-semibold ${active ? 'text-[var(--color-gold-2)]' : 'text-[var(--txt-2)]'}`}>
                {fmt(times[p.key])}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] italic text-[var(--txt-4)]">
        Calculated locally (±2 min) — confirm with your local masjid timetable.
      </p>
    </div>
  );
}

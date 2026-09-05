'use client';
import { useEffect, useMemo, useState } from 'react';

const KAABA = { lat: 21.4225, lng: 39.8262 };
const FALLBACK = { lat: 33.6844, lng: 73.0479, label: 'Islamabad (default)' };
const DEG = Math.PI / 180;

/** Great-circle initial bearing from (lat,lng) to the Kaaba, 0–360° from true North. */
function qiblaBearing(lat: number, lng: number): number {
  const dLng = (KAABA.lng - lng) * DEG;
  const y = Math.sin(dLng);
  const x = Math.cos(lat * DEG) * Math.tan(KAABA.lat * DEG) - Math.sin(lat * DEG) * Math.cos(dLng);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

export default function QiblaCompass() {
  const [loc, setLoc] = useState<{ lat: number; lng: number; label: string }>(FALLBACK);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'Your location' }),
      () => {}, // denied → fallback stays
      { timeout: 8000 },
    );
  }, []);

  const bearing = useMemo(() => qiblaBearing(loc.lat, loc.lng), [loc.lat, loc.lng]);

  return (
    <div className="space-y-3 text-center">
      <div className="relative mx-auto size-36">
        <svg viewBox="0 0 144 144" className="size-full">
          <circle cx="72" cy="72" r="66" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <circle cx="72" cy="72" r="58" fill="none" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 6" />
          {(['N', 'E', 'S', 'W'] as const).map((d, i) => (
            <text
              key={d}
              x={72 + 52 * Math.sin((i * 90) * DEG)}
              y={72 - 52 * Math.cos((i * 90) * DEG) + 4}
              textAnchor="middle"
              fontSize="10"
              fill={d === 'N' ? 'var(--color-gold-2)' : 'var(--txt-4)'}
              fontWeight={d === 'N' ? 700 : 400}
            >
              {d}
            </text>
          ))}
          {/* Needle toward the Kaaba */}
          <g transform={`rotate(${bearing} 72 72)`} style={{ transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)' }}>
            <path d="M72 22 L78 72 L72 66 L66 72 Z" fill="var(--color-gold)" />
            <circle cx="72" cy="72" r="4" fill="var(--color-gold-2)" />
          </g>
        </svg>
        <div className="absolute inset-x-0 -bottom-1 font-[var(--font-arabic)] text-sm leading-[1.8] text-[var(--color-gold-2)]">
          قبلہ
        </div>
      </div>

      <div>
        <div className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
          {Math.round(bearing)}°
        </div>
        <div className="text-[11px] text-[var(--txt-3)]">from true North · {loc.label}</div>
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--txt-4)]">
        Face North with a compass (or your phone&apos;s compass app), then turn {Math.round(bearing)}° clockwise.
        The bearing is from <em>true</em> North — set your compass app to true north, or account for local
        magnetic declination (negligible in Pakistan, up to ~15° in North America).
      </p>
    </div>
  );
}

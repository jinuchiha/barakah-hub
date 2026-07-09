'use client';
import { useState } from 'react';

// Fitrana (Sadaqat al-Fitr) is owed per household member. The rate follows
// the local staple-food price, so it changes every Ramadan — editable with
// common presets rather than hardcoded as truth.
const RATE_PRESETS = [
  { label: 'Wheat · گندم', amount: 350 },
  { label: 'Barley · جو', amount: 700 },
  { label: 'Dates · کھجور', amount: 2800 },
];

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);
}

export default function FitranaCalc({ familyCount }: { familyCount: number }) {
  const [people, setPeople] = useState('1');
  const [rate, setRate] = useState(String(RATE_PRESETS[0].amount));

  const peopleN = Math.max(0, parseInt(people, 10) || 0);
  const rateN = Math.max(0, parseFloat(rate.replace(/,/g, '')) || 0);
  const total = peopleN * rateN;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-[var(--txt-3)]">People in your household · گھر کے افراد</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[rgba(200,155,60,0.12)]"
          />
          {familyCount > 1 && (
            <button
              type="button"
              onClick={() => setPeople(String(familyCount))}
              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--color-gold-4)] hover:border-[var(--border-accent)] hover:text-[var(--color-gold-2)]"
            >
              Whole family: {familyCount}
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--txt-3)]">Rate per person (PKR)</label>
        <input
          type="number"
          min={0}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[rgba(200,155,60,0.12)]"
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {RATE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setRate(String(p.amount))}
              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] text-[var(--txt-3)] hover:border-[var(--border-accent)] hover:text-[var(--color-gold-2)]"
            >
              {p.label} · {p.amount}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surf-3)] p-3">
        <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-gold-4)]">Total Fitrana</div>
        <div className="mt-1 font-[var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">{fmt(total)}</div>
        <div className="mt-0.5 text-[10px] text-[var(--txt-4)]">
          {peopleN} {peopleN === 1 ? 'person' : 'people'} × {fmt(rateN)}
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-[var(--txt-4)]">
        Rates track local staple prices and change each Ramadan — confirm the current rate with your local
        masjid or a reliable scholar. Pay before Eid prayer.
      </p>
    </div>
  );
}

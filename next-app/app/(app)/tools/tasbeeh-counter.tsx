'use client';
import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'bh-tasbeeh';

/**
 * Dhikr presets. The 33 / 33 / 34 sequence is the Tasbih of Fatimah
 * (Sahih al-Bukhari 3113); the counts are part of the sunnah, so the
 * counter must be able to display them exactly — including the final
 * number, which the previous implementation wrapped to 0 one tap early.
 */
const DHIKR = [
  { arabic: 'سُبْحَانَ اللهِ', latin: 'SubhanAllah', target: 33 },
  { arabic: 'اَلْحَمْدُ لِلّٰهِ', latin: 'Alhamdulillah', target: 33 },
  { arabic: 'اللهُ أَكْبَرُ', latin: 'Allahu Akbar', target: 34 },
  { arabic: 'لَا إِلٰهَ إِلَّا اللهُ', latin: 'La ilaha illallah', target: 100 },
  { arabic: '', latin: 'Free count', target: 0 }, // 0 = unbounded
] as const;

interface Saved { count: number; dhikr: number; lifetime: number }

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>;
      return {
        count: typeof parsed.count === 'number' ? parsed.count : 0,
        dhikr: typeof parsed.dhikr === 'number' && parsed.dhikr >= 0 && parsed.dhikr < DHIKR.length ? parsed.dhikr : 0,
        lifetime: typeof parsed.lifetime === 'number' ? parsed.lifetime : 0,
      };
    }
  } catch { /* corrupted → fresh start */ }
  return { count: 0, dhikr: 0, lifetime: 0 };
}

export default function TasbeehCounter() {
  // Hydration-safe: render zeros on the server, load real state after mount.
  const [state, setState] = useState<Saved>({ count: 0, dhikr: 0, lifetime: 0 });
  const [ready, setReady] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    // Restore after paint (rAF) — a client-only localStorage read can't be a
    // useState initializer without a server/client hydration mismatch.
    const id = requestAnimationFrame(() => {
      setState(load());
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const active = DHIKR[state.dhikr] ?? DHIKR[0];
  const done = active.target > 0 && state.count >= active.target;

  function tap() {
    setState((s) => {
      const d = DHIKR[s.dhikr] ?? DHIKR[0];
      // A completed set restarts at 1 on the next tap — the final number
      // (33, 34, 100) stays visible until then, so the count is verifiable.
      const next = d.target > 0 && s.count >= d.target ? 1 : s.count + 1;
      if (d.target > 0 && next === d.target) navigator.vibrate?.(120);
      else navigator.vibrate?.(8);
      return { ...s, count: next, lifetime: s.lifetime + 1 };
    });
    setPulse(true);
    setTimeout(() => setPulse(false), 130);
  }

  const progress = active.target > 0 ? Math.min(state.count / active.target, 1) : 0;

  return (
    <div className="space-y-3 text-center">
      {/* The dhikr being counted — the point of a tasbeeh */}
      <div className="min-h-[44px]">
        {active.arabic ? (
          <>
            <div dir="rtl" lang="ar" className="font-[var(--font-quran)] text-xl leading-relaxed text-[var(--color-gold-2)]">{active.arabic}</div>
            <div className="text-[10.5px] tracking-[1px] text-[var(--txt-4)]">{active.latin}{active.target > 0 ? ` · ${active.target}×` : ''}</div>
          </>
        ) : (
          <div className="pt-3 text-[10.5px] tracking-[1px] text-[var(--txt-4)]">Free count</div>
        )}
      </div>

      <button
        type="button"
        onClick={tap}
        aria-label={`Count ${active.latin}`}
        className="relative mx-auto grid size-36 cursor-pointer select-none place-items-center rounded-full border transition-transform duration-100"
        style={{
          borderColor: done ? 'var(--color-gold)' : 'var(--border-accent)',
          background: 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-gold) 12%, transparent), var(--surf-3))',
          transform: pulse ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        {active.target > 0 && (
          <svg viewBox="0 0 144 144" className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="72" cy="72" r="68" fill="none"
              stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${progress * 427} 427`}
              style={{ transition: 'stroke-dasharray 0.2s ease' }}
            />
          </svg>
        )}
        <span aria-live="polite" className="font-[var(--font-display)] text-5xl font-bold text-[var(--color-gold)]">
          {state.count}
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {DHIKR.map((d, i) => (
          <button
            key={d.latin}
            type="button"
            onClick={() => setState((s) => ({ ...s, dhikr: i, count: 0 }))}
            aria-pressed={state.dhikr === i}
            className="rounded-full border px-3 py-1 text-[11px] transition-colors"
            style={{
              borderColor: state.dhikr === i ? 'var(--color-gold)' : 'var(--border)',
              color: state.dhikr === i ? 'var(--color-gold-2)' : 'var(--txt-3)',
            }}
          >
            {d.target === 0 ? '∞' : `${d.latin} ${d.target}`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setState((s) => ({ ...s, count: 0 }))}
          aria-label="Reset count"
          className="grid size-7 place-items-center rounded-full border border-[var(--border)] text-[var(--txt-3)] hover:border-[var(--border-accent)] hover:text-[var(--color-gold-2)]"
        >
          <RotateCcw className="size-3" />
        </button>
      </div>

      <div className="text-[10px] text-[var(--txt-4)]">
        33 · 33 · 34 — Tasbih of Fatimah (Sahih al-Bukhari 3113) · Lifetime:{' '}
        <span className="text-[var(--color-gold-4)]">{state.lifetime.toLocaleString()}</span> · saved on this device
      </div>
    </div>
  );
}

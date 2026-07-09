'use client';
import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'bh-tasbeeh';
const TARGETS = [33, 100, 0]; // 0 = free count

interface Saved { count: number; target: number; lifetime: number }

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch { /* corrupted → fresh start */ }
  return { count: 0, target: 33, lifetime: 0 };
}

export default function TasbeehCounter() {
  // Hydration-safe: render zeros on the server, load real state after mount.
  const [state, setState] = useState<Saved>({ count: 0, target: 33, lifetime: 0 });
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

  function tap() {
    setState((s) => {
      const next = s.count + 1;
      const wrapped = s.target > 0 && next >= s.target ? 0 : next;
      if (s.target > 0 && next >= s.target) navigator.vibrate?.(120);
      else navigator.vibrate?.(8);
      return { ...s, count: wrapped, lifetime: s.lifetime + 1 };
    });
    setPulse(true);
    setTimeout(() => setPulse(false), 130);
  }

  const progress = state.target > 0 ? state.count / state.target : 0;

  return (
    <div className="space-y-3 text-center">
      <button
        type="button"
        onClick={tap}
        aria-label="Count dhikr"
        className="relative mx-auto grid size-36 cursor-pointer select-none place-items-center rounded-full border transition-transform duration-100"
        style={{
          borderColor: 'var(--border-accent)',
          background: 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-gold) 12%, transparent), var(--surf-3))',
          transform: pulse ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        {state.target > 0 && (
          <svg viewBox="0 0 144 144" className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="72" cy="72" r="68" fill="none"
              stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={`${progress * 427} 427`}
              style={{ transition: 'stroke-dasharray 0.2s ease' }}
            />
          </svg>
        )}
        <span className="font-[var(--font-display)] text-5xl font-bold text-[var(--color-gold)]">
          {state.count}
        </span>
      </button>

      <div className="flex items-center justify-center gap-1.5">
        {TARGETS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setState((s) => ({ ...s, target: t, count: 0 }))}
            className="rounded-full border px-3 py-1 text-[11px] transition-colors"
            style={{
              borderColor: state.target === t ? 'var(--color-gold)' : 'var(--border)',
              color: state.target === t ? 'var(--color-gold-2)' : 'var(--txt-3)',
            }}
          >
            {t === 0 ? '∞' : t}
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
        Lifetime: <span className="text-[var(--color-gold-4)]">{state.lifetime.toLocaleString()}</span> · saved on this device
      </div>
    </div>
  );
}

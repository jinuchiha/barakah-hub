'use client';
import { useState } from 'react';

/**
 * Appearance switcher. The old 11-palette grid was a leftover from a
 * previous design system — the classes were intentionally empty no-ops,
 * so the buttons LOOKED like themes but changed nothing (users noticed).
 * What actually works is dark/light, so that's all we offer, persisted
 * in localStorage and applied pre-paint by the boot script in layout.
 */
export default function ThemePicker() {
  // Lazy init reads the class the boot script already applied — no
  // effect-driven setState, no hydration flash.
  const [mode, setMode] = useState<'dark' | 'light'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? 'light' : 'dark',
  );

  function setMd(m: 'dark' | 'light') {
    const html = document.documentElement;
    html.classList.toggle('light', m === 'light');
    html.classList.toggle('dark', m === 'dark');
    try { localStorage.setItem('bh-mode', m); } catch { /* private mode */ }
    setMode(m);
  }

  const OPTIONS = [
    { key: 'dark' as const, title: 'Dark · رات', desc: 'Deep ink sky, gold light, the space field', swatch: ['#0a0f1a', '#d9b04c', '#1e2d4a'] },
    { key: 'light' as const, title: 'Light · دن', desc: 'Clean paper, ink text, quiet gold', swatch: ['#f7f5f0', '#9c7a2e', '#ffffff'] },
  ];

  return (
    <div>
      <p className="mb-3 text-xs italic text-[var(--color-gold-4)]">
        Appearance is saved on this device and applies instantly.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setMd(o.key)}
            aria-pressed={mode === o.key}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
              mode === o.key
                ? 'border-[var(--color-gold)] bg-[rgba(200,155,60,0.08)] ring-1 ring-[var(--color-gold)]/40'
                : 'border-[var(--border)] hover:bg-[var(--surf-3)]'
            }`}
          >
            <span className="flex shrink-0 gap-1">
              {o.swatch.map((c, i) => (
                <span key={i} className="size-4 rounded-full border border-[var(--border-2)]" style={{ background: c }} />
              ))}
            </span>
            <span>
              <span className="block text-sm font-semibold text-[var(--color-cream)]">{o.title}</span>
              <span className="mt-0.5 block text-[11px] text-[var(--txt-3)]">{o.desc}</span>
            </span>
            {mode === o.key && <span className="ml-auto text-[var(--color-gold)]">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

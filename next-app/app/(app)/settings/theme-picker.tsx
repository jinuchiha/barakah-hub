'use client';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { THEMES, themeKeys, type ThemeKey } from '@/lib/themes';
import { updateAdminConfig } from '@/app/actions';

const SWATCHES: Record<ThemeKey, [string, string, string]> = {
  gold:     ['#b8902f', '#d4af3f', '#1f4e3a'],
  emerald:  ['#1f6e4a', '#2d8364', '#b8902f'],
  sapphire: ['#2d5a8c', '#4a7fc1', '#b8902f'],
  ruby:     ['#a83254', '#c44d72', '#b8902f'],
  amethyst: ['#5e4691', '#7a5fb8', '#b8902f'],
  bronze:   ['#a0671e', '#c0833a', '#1f4e3a'],
  forest:   ['#2d6a4f', '#48916c', '#a8862c'],
  midnight: ['#3a4a7a', '#5a6e9e', '#c89b3c'],
  copper:   ['#b85a2e', '#d27447', '#1f4e3a'],
  slate:    ['#475569', '#64748b', '#b8902f'],
  charcoal: ['#3a3a2a', '#5a5a3a', '#b8902f'],
};

export default function ThemePicker({ initial, canSave }: { initial: string; canSave: boolean }) {
  const [active, setActive] = useState<ThemeKey>((initial in THEMES ? initial : 'gold') as ThemeKey);
  const [mode, setMode] = useState<'dark' | 'light'>('dark');
  const [pending, start] = useTransition();

  useEffect(() => {
    const html = document.documentElement;
    themeKeys.forEach((k) => html.classList.remove(`theme-${k}`));
    html.classList.add(`theme-${active}`);
  }, [active]);

  function setMd(m: 'dark' | 'light') {
    const html = document.documentElement;
    html.classList.toggle('light', m === 'light');
    html.classList.toggle('dark', m === 'dark');
    setMode(m);
  }

  function save() {
    if (!canSave) { toast('Theme applied locally — admin can persist for everyone'); return; }
    start(async () => {
      try { await updateAdminConfig({ themePalette: active }); toast.success('Theme persisted for all members'); }
      catch (e: any) { toast.error(e.message); }
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs italic text-[var(--color-gold-4)]">
        Pick a palette — applied across the whole app. {canSave ? 'Click Save to persist for all members.' : '(Local-only for non-admin)'}
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        {themeKeys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(k)}
            aria-pressed={active === k}
            className={`flex w-20 flex-col items-center gap-2 rounded-md p-2 transition-all hover:-translate-y-0.5 ${active === k ? 'bg-[rgba(214,210,199,0.12)] ring-2 ring-[var(--color-gold)]' : 'border border-[var(--border)] hover:bg-[var(--surf-3)]'}`}
          >
            <div className="flex gap-0.5">
              {SWATCHES[k].map((c, i) => <span key={i} className="size-3 rounded-full" style={{ background: c }} />)}
            </div>
            <span className="font-[var(--font-display)] text-[9px] uppercase tracking-[1px] text-[var(--color-cream)]">{THEMES[k].name}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surf-3)] p-3">
        <span className="flex-1 text-sm text-[var(--color-cream)]">Background mode</span>
        <button onClick={() => setMd('dark')} className={`rounded-md px-3 py-1 text-xs ${mode === 'dark' ? 'bg-[var(--color-gold)] text-[var(--color-ink)]' : 'border border-[var(--border)]'}`}>🌙 Dark</button>
        <button onClick={() => setMd('light')} className={`rounded-md px-3 py-1 text-xs ${mode === 'light' ? 'bg-[var(--color-gold)] text-[var(--color-ink)]' : 'border border-[var(--border)]'}`}>☀️ Light</button>
      </div>
      {canSave && (
        <button onClick={save} disabled={pending} className="rounded-md bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] disabled:opacity-50">
          {pending ? 'Saving…' : 'Save for everyone'}
        </button>
      )}
    </div>
  );
}

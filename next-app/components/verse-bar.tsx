'use client';
import { useEffect, useRef, useState } from 'react';
import { VERSES } from '@/lib/i18n/verses';
import { useLocale } from '@/lib/i18n/use-locale';

/**
 * Auto-rotating Quran verse banner (9-second cycle).
 *
 * Rotation pauses on hover/focus (WCAG 2.2.2), stops entirely under
 * prefers-reduced-motion, and skips ticks while the tab is hidden.
 * The Arabic span carries dir/lang so bidi resolves correctly and a
 * narrow viewport truncates from the logical end, not mid-ayah start.
 */
export function VerseBar() {
  const locale = useLocale();
  const [i, setI] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (paused.current || document.hidden) return;
      setI((x) => (x + 1) % VERSES.length);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  const v = VERSES[i];
  if (!v) return null;
  return (
    <div
      className="verse-bar flex shrink-0 items-center justify-center gap-3 border-b border-[var(--border)] px-6 py-1.5"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }}
      onBlur={() => { paused.current = false; }}
    >
      <span dir="rtl" lang="ar" className="truncate font-[var(--font-quran)] text-base text-[var(--color-gold)]">{v.ar}</span>
      <span aria-hidden className="text-xs text-[var(--txt-4)]">·</span>
      <span className="truncate text-xs text-[var(--txt-2)]" dir={locale === 'ur' ? 'rtl' : 'ltr'} lang={locale}>
        {locale === 'ur' ? v.ur : v.en}
      </span>
      <span aria-hidden className="text-xs text-[var(--txt-4)]">·</span>
      <span className="font-[var(--font-en)] whitespace-nowrap text-[10px] tracking-[1px] text-[var(--txt-3)]">{v.ref}</span>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { VERSES } from '@/lib/i18n/verses';

/** Auto-rotating Quran verse banner — 9-second cycle */
export function VerseBar({ locale = 'en' }: { locale?: 'ur' | 'en' }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % VERSES.length), 9000);
    return () => clearInterval(id);
  }, []);
  const v = VERSES[i];
  if (!v) return null;
  return (
    <div className="verse-bar flex shrink-0 items-center justify-center gap-3 border-b border-[var(--border)] px-6 py-1.5">
      <span className="truncate font-[var(--font-arabic)] text-base text-[var(--color-gold)]">{v.ar}</span>
      <span className="text-xs text-[var(--txt-4)]">·</span>
      <span className="truncate text-xs text-[var(--txt-2)]" dir={locale === 'ur' ? 'rtl' : 'ltr'}>
        {locale === 'ur' ? v.ur : v.en}
      </span>
      <span className="text-xs text-[var(--txt-4)]">·</span>
      <span className="font-[var(--font-en)] text-[10px] tracking-[1px] text-[var(--txt-3)]">{v.ref}</span>
    </div>
  );
}

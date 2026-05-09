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
  return (
    <div className="flex shrink-0 items-center justify-center gap-3 border-b border-[rgba(30,42,74,0.4)] bg-gradient-to-r from-[var(--color-emerald-3)] via-[#0f4a30] to-[var(--color-emerald-3)] px-6 py-1.5">
      <span className="truncate font-[var(--font-arabic)] text-base text-[var(--color-gold)]">{v.ar}</span>
      <span className="text-xs text-white/20">·</span>
      <span className="truncate text-xs text-white/70" dir={locale === 'ur' ? 'rtl' : 'ltr'}>
        {locale === 'ur' ? v.ur : v.en}
      </span>
      <span className="text-xs text-white/20">·</span>
      <span className="font-[var(--font-en)] text-[10px] tracking-[1px] text-[rgba(30,42,74,0.85)]">{v.ref}</span>
    </div>
  );
}

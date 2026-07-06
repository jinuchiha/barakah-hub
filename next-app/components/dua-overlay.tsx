'use client';
import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { randomDua } from '@/lib/duas';

interface DuaOverlayProps {
  open: boolean;
  onClose: () => void;
  /** 'sadaqah' | 'zakat' — only tweaks the heading copy. */
  pool?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Full-screen blessing shown right after a member gives sadqa —
 * a randomly chosen sourced dua/ayah, revealed in Arabic, Urdu,
 * then English. Dismisses on tap, Esc, or after 12s.
 */
export function DuaOverlay({ open, onClose, pool = 'sadaqah' }: DuaOverlayProps) {
  const reduce = useReducedMotion();
  // Pick once per open, not per render.
  const dua = useMemo(() => (open ? randomDua() : null), [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 12_000);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const fadeUp = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.7, delay: reduce ? 0 : delay, ease: EASE },
  });

  return (
    <AnimatePresence>
      {open && dua && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Dua for your sadaqah"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(4,7,13,0.82)] px-5 backdrop-blur-md"
        >
          {/* Ambient gold bloom behind the card */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(200,155,60,0.22), transparent 62%)' }}
          />

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-r-lg)] border border-[rgba(200,155,60,0.28)] bg-[var(--color-ink-2)] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-12"
          >
            {/* Hairline gold crown */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-2)] to-transparent" />

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--txt-4)] transition-colors hover:text-[var(--txt-1)]"
            >
              <X className="size-4" />
            </button>

            <motion.div {...fadeUp(0.1)} className="text-[10px] font-bold uppercase tracking-[3px] text-[var(--color-gold-4)]">
              {pool === 'zakat' ? 'Zakat qubool ho · تقبل الله' : 'Sadqa qubool ho · تقبل الله'}
            </motion.div>

            <motion.p
              {...fadeUp(0.35)}
              dir="rtl"
              lang="ar"
              className="mx-auto mt-7 max-w-lg font-[var(--font-arabic)] text-2xl leading-[2.3] text-[var(--color-gold-3)] md:text-[27px]"
            >
              {dua.arabic}
            </motion.p>

            <motion.p
              {...fadeUp(0.65)}
              dir="rtl"
              lang="ur"
              className="mx-auto mt-6 max-w-md font-[var(--font-arabic)] text-[15px] leading-[2.4] text-[var(--txt-2)]"
            >
              {dua.urdu}
            </motion.p>

            <motion.p {...fadeUp(0.9)} className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[var(--txt-3)]">
              {dua.english}
            </motion.p>

            <motion.div {...fadeUp(1.1)} className="mt-7 flex items-center justify-center gap-3">
              <span aria-hidden className="h-px w-10 bg-[rgba(200,155,60,0.35)]" />
              <span className="text-[10.5px] font-semibold tracking-[1.5px] text-[var(--color-gold-4)]">{dua.source}</span>
              <span aria-hidden className="h-px w-10 bg-[rgba(200,155,60,0.35)]" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

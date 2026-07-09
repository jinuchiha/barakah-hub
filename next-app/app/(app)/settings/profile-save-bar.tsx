'use client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface ProfileSaveBarProps {
  visible: boolean;
  pending: boolean;
  onReset: () => void;
}

/** Sticky bottom bar — only mounted while the form is dirty. */
export function ProfileSaveBar({ visible, pending, onReset }: ProfileSaveBarProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? false : { y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 32, opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-r-sm)] border border-[var(--border-accent)] px-4 py-3 sm:px-5"
          style={{
            background: 'color-mix(in srgb, var(--surf-1) 92%, transparent)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p className="text-[12px] text-[var(--txt-2)]">You have unsaved changes.</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={pending}>
              Reset
            </Button>
            <Button type="submit" variant="gold" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  index: number;
  /** Optional right-aligned header slot (e.g. a test button). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Glass section card — translucent surface + gold icon header, staggers in once on mount. */
export function SectionCard({ id, title, icon: Icon, index, action, className, children }: SectionCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduce ? 0 : index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={cn('scroll-mt-24 rounded-[var(--radius-r)] border border-[var(--border)] p-5 sm:p-6', className)}
      style={{
        background: 'color-mix(in srgb, var(--surf-1) 72%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <Icon size={15} className="shrink-0 text-[var(--color-gold)]" aria-hidden />
          <h3 className="text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--color-cream)]">{title}</h3>
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

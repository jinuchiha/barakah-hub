'use client';
import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type Tone = 'emerald' | 'gold' | 'ruby' | 'sapphire' | 'violet' | 'ocean';

interface StatCardProps {
  label: string;
  sublabel?: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  spark?: number[];
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional delta: e.g. "+12.4%". Sign drives the color. */
  delta?: string;
}

const TONE_ACCENT: Record<Tone, string> = {
  emerald:  '#2d8a5f',
  gold:     '#c89b3c',
  ruby:     '#b9556a',
  sapphire: '#608dd7',
  violet:   '#8b6ec9',
  ocean:    '#4ab8d6',
};

export function StatCard({ label, sublabel, value, hint, tone = 'emerald', spark, icon: Icon, delta }: StatCardProps) {
  const accent = TONE_ACCENT[tone];
  const reduce = useReducedMotion();
  const deltaSign = delta?.[0] === '-' ? 'down' : delta?.[0] === '+' ? 'up' : null;

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={cn(
        'sc-base group relative flex min-h-[124px] flex-col justify-between rounded-[var(--radius-r)] p-5 transition-colors',
        'hover:border-[var(--border-2)]',
      )}
      style={{ boxShadow: `inset 3px 0 0 0 ${accent}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[1.4px] text-[var(--txt-3)]">{label}</div>
          {sublabel && <div className="mt-0.5 text-[11px] text-[var(--txt-4)]">{sublabel}</div>}
        </div>
        {Icon && (
          <div
            className="grid size-8 shrink-0 place-items-center rounded-md transition-colors"
            style={{ background: `${accent}14`, color: accent }}
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="num-display text-[28px] leading-none text-[var(--color-cream)]">
          {value}
        </div>
        {spark && spark.length > 0 && <Sparkline values={spark} color={accent} />}
      </div>

      {(hint || delta) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
          {hint && <span className="text-[var(--txt-3)]">{hint}</span>}
          {delta && (
            <span
              className={cn(
                'tabular font-semibold',
                deltaSign === 'up' && 'text-[#4ec38d]',
                deltaSign === 'down' && 'text-[#f08585]',
                !deltaSign && 'text-[var(--txt-3)]',
              )}
            >
              {delta}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 72, h = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h * 0.85 - 2;
    return [x, y] as const;
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1][0].toFixed(1)} ${h} L 0 ${h} Z`;
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <svg
      style={{ width: 72, height: 28 }}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  /** Pre-rendered icon element, e.g. `<Wallet />`. Sized via parent CSS.
   *  Must be a JSX element — passing a bare component reference from a
   *  Server Component would fail React's serialization boundary. */
  icon?: React.ReactNode;
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

export function StatCard({ label, sublabel, value, hint, tone = 'emerald', spark, icon, delta }: StatCardProps) {
  const accent = TONE_ACCENT[tone];
  const reduce = useReducedMotion();
  const deltaSign = delta?.[0] === '-' ? 'down' : delta?.[0] === '+' ? 'up' : null;

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -1, scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={cn(
        'sc-base group relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-[var(--radius-r)] p-5',
        'cursor-default select-none',
      )}
      style={{
        boxShadow: `inset 3px 0 0 0 ${accent}, 0 8px 24px -8px ${accent}35`,
      }}
    >
      {/* Radial ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 group-hover:opacity-130"
        style={{ background: `radial-gradient(120% 100% at 0% 0%, ${accent}18, transparent 60%)` }}
      />
      {/* Bottom fade line matching accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] opacity-50"
        style={{ background: `linear-gradient(90deg, ${accent}80, transparent)` }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[1.6px] text-[var(--txt-3)]">{label}</div>
          {sublabel && <div className="mt-0.5 text-[10.5px] text-[var(--txt-4)]">{sublabel}</div>}
        </div>
        {icon && (
          <div
            className="grid size-7 shrink-0 place-items-center rounded-lg [&>svg]:size-3.5"
            style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}22` }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="relative mt-3 flex items-end justify-between gap-3">
        <div className="num-display text-[26px] leading-none tracking-[-0.5px] text-[var(--color-cream)]">
          {value}
        </div>
        {spark && spark.length > 0 && <Sparkline values={spark} color={accent} />}
      </div>

      {/* Hint / delta */}
      {(hint || delta) && (
        <div className="relative mt-2 flex items-center justify-between gap-2 text-[10.5px]">
          {hint && <span className="text-[var(--txt-4)]">{hint}</span>}
          {delta && (
            <span
              className={cn(
                'tabular font-bold rounded-full px-1.5 py-0.5 text-[9px]',
                deltaSign === 'up' && 'bg-[rgba(45,138,95,0.12)] text-[#4ec38d]',
                deltaSign === 'down' && 'bg-[rgba(220,82,82,0.12)] text-[#f08585]',
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

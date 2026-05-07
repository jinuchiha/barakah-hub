import { cn } from '@/lib/utils';

type Tone = 'emerald' | 'gold' | 'ruby' | 'sapphire' | 'violet' | 'ocean';

interface StatCardProps {
  label: string;
  sublabel?: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  spark?: number[];
}

/** Adminty-style vibrant gradient stat card with optional inline SVG sparkline. */
export function StatCard({ label, sublabel, value, hint, tone = 'emerald', spark }: StatCardProps) {
  const toneClass = {
    emerald: 'sc-grad-emerald',
    gold:    'sc-grad-gold',
    ruby:    'sc-grad-ruby',
    sapphire:'sc-grad-sapphire',
    violet:  'sc-grad-violet',
    ocean:   'sc-grad-ocean',
  }[tone];

  return (
    <div
      className={cn(
        'relative flex min-h-[130px] flex-col justify-between overflow-hidden rounded-[var(--radius-r)] p-5 text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.28)]',
        toneClass,
      )}
    >
      {/* Decorative bubble */}
      <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -right-10 size-36 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/70">{label}</div>
        {sublabel && <div className="mt-0.5 text-xs text-white/60">{sublabel}</div>}
        <div className="mt-2 font-[var(--font-display)] text-3xl font-bold tracking-tight drop-shadow-sm">
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-white/85">{hint}</div>}
      </div>

      {spark && spark.length > 0 && <Sparkline values={spark} />}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 60, h = 30;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h * 0.9 - 2;
    return [x, y] as const;
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1][0].toFixed(1)} ${h} L 0 ${h} Z`;
  return (
    <svg
      className="absolute bottom-3.5 right-4 z-10 opacity-70"
      style={{ width: 60, height: 30 }}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill="rgba(255,255,255,0.18)" />
      <path d={path} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

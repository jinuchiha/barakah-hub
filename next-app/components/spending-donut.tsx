import { fmtRs } from '@/lib/i18n/dict';

/**
 * Spending donut — server-rendered SVG so no extra JS bundle.
 *
 * Renders an arc per slice + legend underneath. Slices are passed in;
 * order = clockwise from 12 o'clock. Hover handled by the parent if
 * needed (we keep this dumb to stay an RSC).
 */
export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  slices: DonutSlice[];
  size?: number;
}

export function SpendingDonut({ title, slices, size = 200 }: Props) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const visible = slices.filter((s) => s.value > 0);

  if (total === 0 || visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="text-3xl opacity-30">⊘</div>
        <p className="text-xs italic text-[var(--txt-3)]">No spending data yet</p>
      </div>
    );
  }

  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;
  const arcs = visible.map((s) => {
    const fraction = s.value / total;
    const dasharray = `${fraction * circ} ${circ - fraction * circ}`;
    const dashoffset = -cumulative * circ;
    cumulative += fraction;
    return { ...s, dasharray, dashoffset, percent: Math.round(fraction * 100) };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(200,155,60,0.06)" strokeWidth={20} />
          {/* Slices — rotated -90° so we start at 12 o'clock */}
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={20}
                strokeDasharray={a.dasharray}
                strokeDashoffset={a.dashoffset}
                strokeLinecap="butt"
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-[var(--font-display)] text-[10px] uppercase tracking-[2px] text-[var(--color-gold-4)]">Total</span>
          <span className="mt-1 text-lg font-bold text-[var(--color-gold-2)]">{fmtRs(total)}</span>
        </div>
      </div>

      <ul className="flex w-full max-w-xs flex-col gap-2">
        {arcs.map((a) => (
          <li key={a.key} className="flex items-center gap-3 text-sm">
            <span className="size-3 rounded-full" style={{ background: a.color }} aria-hidden="true" />
            <span className="flex-1 text-[var(--color-cream)]">{a.label}</span>
            <span className="font-[var(--font-en)] text-xs text-[var(--color-gold-4)]">{a.percent}%</span>
            <span className="font-bold text-[var(--color-gold-2)]">{fmtRs(a.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

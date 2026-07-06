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
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div
          className="grid size-14 place-items-center rounded-full border border-[var(--border)]"
          style={{ background: 'radial-gradient(circle at 30% 30%, rgba(200,155,60,0.10), transparent 70%)' }}
        >
          <span className="text-[20px] text-[var(--color-gold-4)]">☾</span>
        </div>
        <p className="text-[12px] font-medium text-[var(--txt-3)]">Nothing here yet</p>
        <p className="text-[10.5px] text-[var(--txt-4)]">Data will appear as activity comes in</p>
      </div>
    );
  }

  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  const arcs = visible.map((s, i) => {
    const fraction = s.value / total;
    // Prefix sum of prior fractions (no mutable outer var — keeps the React
    // Compiler lint happy). The pool list is tiny, so O(n²) is fine.
    const prior = visible.slice(0, i).reduce((sum, x) => sum + x.value / total, 0);
    const dasharray = `${fraction * circ} ${circ - fraction * circ}`;
    const dashoffset = -prior * circ;
    return { ...s, dasharray, dashoffset, percent: Math.round(fraction * 100) };
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={16} />
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={16}
                strokeDasharray={a.dasharray}
                strokeDashoffset={a.dashoffset}
                strokeLinecap="butt"
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9.5px] font-semibold uppercase tracking-[1.6px] text-[var(--txt-3)]">Total</span>
          <span className="num-display mt-1 text-[15px] text-[var(--color-cream)]">{fmtRs(total)}</span>
        </div>
      </div>

      <ul className="flex w-full max-w-xs flex-col gap-2" aria-label="Legend">
        {arcs.map((a) => (
          <li key={a.key} className="flex items-center gap-2.5 text-[12.5px]">
            <span className="size-2 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden="true" />
            <span className="flex-1 truncate text-[var(--color-cream)]">{a.label}</span>
            <span className="tabular shrink-0 text-[10.5px] text-[var(--txt-3)]">{a.percent}%</span>
            <span className="num shrink-0 font-semibold text-[var(--color-cream)]">{fmtRs(a.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

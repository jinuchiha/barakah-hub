/**
 * Stacked monthly bar chart for the fund register. Pure SVG — no chart
 * library dependency, since the data shape is small (12 buckets × 3
 * pools). Server-rendered with the rest of the page; no client JS.
 *
 * Pool colors mirror `app/globals.css` brand tokens:
 *   sadaqah → emerald (navy under the brutalist palette)
 *   zakat   → gold-cream (off-white)
 *   qarz    → ocean-blue
 */
import { fmtRs } from '@/lib/i18n/dict';

export interface MonthBucket {
  monthStart: string;       // ISO date — first of month
  monthLabel: string;       // 'May 2026'
  sadaqah: number;
  zakat: number;
  qarz: number;
}

const POOL_COLORS = {
  sadaqah: 'var(--color-emerald-2)',
  zakat:   'var(--color-gold)',
  qarz:    '#3b82f6',
} as const;

export function MonthlyFundChart({ buckets }: { buckets: MonthBucket[] }) {
  if (buckets.length === 0) {
    return (
      <div className="py-10 text-center text-sm italic text-[var(--txt-3)]">
        No payments yet · chart will appear once verified payments are recorded.
      </div>
    );
  }

  const totals = buckets.map((b) => b.sadaqah + b.zakat + b.qarz);
  const max = Math.max(...totals, 1);

  // Geometry: chart fills 100% width, bars have a gap, height fixed.
  // Bar width is capped so 2-3 months don't render as giant slabs.
  const W = 720;
  const H = 180;
  const gap = 10;
  const barW = Math.min(56, (W - gap * (buckets.length - 1)) / buckets.length);
  const groupW = barW * buckets.length + gap * (buckets.length - 1);
  const xOffset = (W - groupW) / 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H + 32}`}
        className="block w-full min-w-[480px]"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Monthly fund inflow over ${buckets.length} months`}
      >
        <defs>
          <linearGradient id="mf-sadaqah" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3aa574" />
            <stop offset="100%" stopColor="#1d5c3f" />
          </linearGradient>
          <linearGradient id="mf-zakat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8c563" />
            <stop offset="100%" stopColor="#9c7a2e" />
          </linearGradient>
          <linearGradient id="mf-qarz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ba3f5" />
            <stop offset="100%" stopColor="#2856a8" />
          </linearGradient>
        </defs>
        {/* Quiet horizontal guides */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(236,235,230,0.05)" strokeWidth={1} />
        ))}
        {buckets.map((b, i) => {
          const total = b.sadaqah + b.zakat + b.qarz;
          const x = xOffset + i * (barW + gap);
          const sH = (b.sadaqah / max) * H;
          const zH = (b.zakat / max) * H;
          const qH = (b.qarz / max) * H;
          let y = H;
          const segments: Array<[number, number, string]> = [];
          if (sH > 0) { y -= sH; segments.push([y, sH, 'url(#mf-sadaqah)']); }
          if (zH > 0) { y -= zH; segments.push([y, zH, 'url(#mf-zakat)']); }
          if (qH > 0) { y -= qH; segments.push([y, qH, 'url(#mf-qarz)']); }
          const parts = b.monthLabel.split(' ');
          const mon = parts[0] ?? b.monthLabel;
          const yr  = parts[1] ?? '';
          const showYear = i === 0 || (i > 0 && (buckets[i - 1].monthLabel.split(' ')[1] ?? '') !== yr);
          return (
            <g key={b.monthStart}>
              <title>{`${b.monthLabel}: ${fmtRs(total)}`}</title>
              {segments.map(([sy, sh, fill], k) => (
                <rect
                  key={k}
                  x={x}
                  y={sy}
                  width={barW}
                  height={sh}
                  fill={fill}
                  rx={k === segments.length - 1 ? 4 : 0}
                  className="chart-bar-grow"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
              {/* Month label */}
              <text
                x={x + barW / 2}
                y={H + 14}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill="var(--color-gold-4)"
              >
                {mon.slice(0, 3)}
              </text>
              {/* Year label — only when year changes */}
              {showYear && (
                <text
                  x={x + barW / 2}
                  y={H + 24}
                  textAnchor="middle"
                  fontSize={8}
                  fill="rgba(125,119,104,0.55)"
                >
                  {yr}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--txt-3)]">
        <Legend color={POOL_COLORS.sadaqah} label="Sadaqah" />
        <Legend color={POOL_COLORS.zakat}   label="Zakat" />
        <Legend color={POOL_COLORS.qarz}    label="Qarz" />
        <span className="ml-auto text-[var(--color-gold-4)]">
          Peak: {fmtRs(max)} · Total {fmtRs(totals.reduce((a, b) => a + b, 0))}
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block size-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

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
        No payments yet — chart will appear once verified payments are recorded.
      </div>
    );
  }

  const totals = buckets.map((b) => b.sadaqah + b.zakat + b.qarz);
  const max = Math.max(...totals, 1);

  // Geometry: chart fills 100% width, bars have a gap, height fixed.
  const W = 720;
  const H = 180;
  const gap = 6;
  const barW = (W - gap * (buckets.length - 1)) / buckets.length;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H + 24}`}
        className="block w-full min-w-[480px]"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Monthly fund inflow over ${buckets.length} months`}
      >
        {buckets.map((b, i) => {
          const total = b.sadaqah + b.zakat + b.qarz;
          const x = i * (barW + gap);
          const sH = (b.sadaqah / max) * H;
          const zH = (b.zakat / max) * H;
          const qH = (b.qarz / max) * H;
          let y = H;
          const segments: Array<[number, number, string]> = [];
          if (sH > 0) { y -= sH; segments.push([y, sH, POOL_COLORS.sadaqah]); }
          if (zH > 0) { y -= zH; segments.push([y, zH, POOL_COLORS.zakat]); }
          if (qH > 0) { y -= qH; segments.push([y, qH, POOL_COLORS.qarz]); }
          return (
            <g key={b.monthStart}>
              <title>{`${b.monthLabel}: ${fmtRs(total)}`}</title>
              {segments.map(([sy, sh, fill], k) => (
                <rect key={k} x={x} y={sy} width={barW} height={sh} fill={fill} rx={2} />
              ))}
              <text
                x={x + barW / 2}
                y={H + 14}
                textAnchor="middle"
                className="fill-[var(--color-gold-4)] text-[9px] font-semibold uppercase tracking-wider"
              >
                {b.monthLabel.split(' ')[0].slice(0, 3)}
              </text>
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

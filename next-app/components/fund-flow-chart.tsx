import { fmtRs } from '@/lib/i18n/dict';

export interface FundFlowPoint {
  label: string;
  inflow: number;
  outflow: number;
}

/**
 * Fund flow trend — hand-rolled SVG area + line chart, no chart library.
 * Server-rendered; data is pre-aggregated by the dashboard page. Static —
 * no hover interactivity, just a clean read of the last 6 months.
 */
export function FundFlowChart({ data }: { data: FundFlowPoint[] }) {
  const activeMonths = data.filter((d) => d.inflow > 0 || d.outflow > 0).length;
  if (activeMonths < 2) {
    return (
      <div className="py-10 text-center text-[12.5px] italic text-[var(--txt-3)]">
        Not enough history yet · chart will fill in as more months pass
      </div>
    );
  }

  const W = 700;
  const H = 280;
  const xPad = 24;
  const topPad = 14;
  const bottomPad = 34;
  const plotH = H - topPad - bottomPad;
  const max = Math.max(...data.map((d) => Math.max(d.inflow, d.outflow)), 1);

  const xAt = (i: number) => xPad + (i / (data.length - 1)) * (W - xPad * 2);
  const yAt = (v: number) => topPad + (1 - v / max) * plotH;
  const baseline = topPad + plotH;

  const inflowPts = data.map((d, i) => [xAt(i), yAt(d.inflow)] as const);
  const outflowPts = data.map((d, i) => [xAt(i), yAt(d.outflow)] as const);
  const inflowLine = inflowPts.map(([x, y]) => `${x},${y}`).join(' ');
  const outflowLine = outflowPts.map(([x, y]) => `${x},${y}`).join(' ');
  const inflowArea = `${xAt(0)},${baseline} ${inflowLine} ${xAt(data.length - 1)},${baseline}`;
  const [lastX, lastY] = inflowPts[inflowPts.length - 1];

  const totalInflow = data.reduce((s, d) => s + d.inflow, 0);
  const totalOutflow = data.reduce((s, d) => s + d.outflow, 0);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[280px] w-full"
        role="img"
        aria-label="Fund flow over the last 6 months"
      >
        <defs>
          <linearGradient id="fund-flow-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(232,197,99,0.30)" />
            <stop offset="100%" stopColor="rgba(232,197,99,0)" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={xPad}
            x2={W - xPad}
            y1={topPad + plotH * f}
            y2={topPad + plotH * f}
            stroke="rgba(236,235,230,0.06)"
            strokeWidth={1}
          />
        ))}

        <polygon points={inflowArea} fill="url(#fund-flow-fill)" />
        <polyline points={outflowLine} fill="none" stroke="var(--tree-blue)" strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
        <polyline points={inflowLine} fill="none" stroke="var(--color-gold)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Endpoint dot — emphasized current month */}
        <circle cx={lastX} cy={lastY} r={4.5} fill="var(--color-gold)" style={{ filter: 'drop-shadow(0 0 5px rgba(232,197,99,0.65))' }} />
        <circle cx={lastX} cy={lastY} r={4.5} fill="none" stroke="var(--surf-1)" strokeWidth={1.5} />

        {data.map((d, i) => (
          <text key={`${d.label}-${i}`} x={xAt(i)} y={H - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-gold-4)">
            {d.label}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[var(--txt-3)]">
        <Legend color="var(--color-gold)" label="Verified inflow" />
        <Legend color="var(--tree-blue)" label="Disbursed (qarz + gifts)" />
        <span className="tabular ml-auto text-[var(--color-gold-4)]">
          {fmtRs(totalInflow)} in · {fmtRs(totalOutflow)} out
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="inline-block h-[2px] w-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

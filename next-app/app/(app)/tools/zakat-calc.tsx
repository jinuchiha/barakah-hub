'use client';
import { useState } from 'react';

/**
 * Zakat estimator — deliberately an *estimator*, not a fatwa engine.
 *
 * The nisab preset is 85g gold × ~PKR 27,000/g (June 2026) and is editable,
 * because gold is a live price a shipped constant cannot track. The silver
 * nisab (595g) is far lower and preferred by many scholars as more
 * beneficial to the poor — the UI says so instead of silently ruling
 * "no Zakat due" off the gold threshold alone.
 */
const GOLD_NISAB_PRESET = 2_295_000;
const NISAB_DATED = 'June 2026';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);
}

export default function ZakatCalc() {
  const [amount, setAmount] = useState('');
  const [debts, setDebts] = useState('');
  const [nisab, setNisab] = useState(String(GOLD_NISAB_PRESET));

  const parsedAssets = parseFloat(amount.replace(/,/g, '')) || 0;
  const parsedDebts = parseFloat(debts.replace(/,/g, '')) || 0;
  const parsedNisab = parseFloat(nisab.replace(/,/g, '')) || GOLD_NISAB_PRESET;
  const net = Math.max(parsedAssets - parsedDebts, 0);
  const meetsNisab = net >= parsedNisab;
  const zakatDue = meetsNisab ? net * 0.025 : 0;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="zakat-assets" className="block text-xs text-[var(--txt-3)]">
          Zakatable assets — cash, gold, silver, trade goods (PKR)
        </label>
        <input
          id="zakat-assets"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 3000000"
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[rgba(200,155,60,0.12)]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="zakat-debts" className="block text-xs text-[var(--txt-3)]">
            Immediate debts (PKR)
          </label>
          <input
            id="zakat-debts"
            type="number"
            value={debts}
            onChange={(e) => setDebts(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[rgba(200,155,60,0.12)]"
          />
        </div>
        <div>
          <label htmlFor="zakat-nisab" className="block text-xs text-[var(--txt-3)]">
            Nisab threshold (PKR)
          </label>
          <input
            id="zakat-nisab"
            type="number"
            value={nisab}
            onChange={(e) => setNisab(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[rgba(200,155,60,0.12)]"
          />
        </div>
      </div>
      <div className="text-[10px] leading-relaxed text-[var(--txt-4)]">
        Preset: 85g gold ≈ {fmt(GOLD_NISAB_PRESET)} ({NISAB_DATED}) — edit to today&rsquo;s rate.
        Many scholars prefer the <span className="text-[var(--txt-3)]">silver nisab (595g silver)</span>, which is much lower — if you hold mixed assets, check it before concluding nothing is due.
      </div>
      {amount && (
        <div className={`rounded-lg p-3 text-sm ${meetsNisab ? 'bg-[rgba(200,155,60,0.08)]' : 'bg-[rgba(255,255,255,0.03)]'}`}>
          {meetsNisab ? (
            <>
              <div className="text-xs text-[var(--txt-3)]">Estimated Zakat (2.5% of {fmt(net)} net):</div>
              <div className="mt-1 font-[var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
                {fmt(zakatDue)}
              </div>
            </>
          ) : (
            <div className="text-[var(--txt-3)]">
              Net assets are below the gold nisab you entered. Zakat may still be due on the silver nisab — confirm with a scholar.
            </div>
          )}
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-[var(--txt-4)]">
        Zakat is due after wealth has been held for one lunar year (hawl). This
        is an estimate for planning — for a binding ruling on your situation,
        consult a qualified scholar.
      </p>
    </div>
  );
}

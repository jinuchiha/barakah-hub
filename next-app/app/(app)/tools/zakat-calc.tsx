'use client';
import { useState } from 'react';

const NISAB_PKR = 2_295_000;

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);
}

export default function ZakatCalc() {
  const [amount, setAmount] = useState('');
  const parsed = parseFloat(amount.replace(/,/g, '')) || 0;
  const zakatBase = Math.max(0, parsed - NISAB_PKR);
  const zakatDue = zakatBase * 0.025;
  const meetsNisab = parsed >= NISAB_PKR;

  return (
    <div className="space-y-3">
      <label className="block text-xs text-[var(--txt-3)]">
        Total savings / assets (PKR)
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 3000000"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surf-3)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--border-accent)] focus:ring-2 focus:ring-[rgba(200,155,60,0.12)]"
      />
      <div className="text-[10px] text-[var(--txt-4)]">
        Nisab threshold: {fmt(NISAB_PKR)} (85g gold equivalent)
      </div>
      {amount && (
        <div className={`rounded-lg p-3 text-sm ${meetsNisab ? 'bg-[rgba(200,155,60,0.08)]' : 'bg-[rgba(255,255,255,0.03)]'}`}>
          {meetsNisab ? (
            <>
              <div className="text-xs text-[var(--txt-3)]">Your Zakat (2.5% of {fmt(zakatBase)} above nisab):</div>
              <div className="mt-1 font-[var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
                {fmt(zakatDue)}
              </div>
            </>
          ) : (
            <div className="text-[var(--txt-3)]">
              Your savings are below nisab — no Zakat is due.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

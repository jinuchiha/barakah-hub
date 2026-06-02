'use client';

/**
 * Triggers the browser's native print dialog. The report page applies
 * print-specific CSS (white background, dark text, hidden nav) so the
 * resulting PDF is clean and readable. User picks "Save as PDF" from
 * the print dialog destination dropdown.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-gradient-to-br from-[var(--color-gold-4)] to-[var(--color-gold)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink)] shadow-md hover:from-[var(--color-gold)] hover:to-[var(--color-gold-2)]"
    >
      🖨 Print / Save PDF
    </button>
  );
}

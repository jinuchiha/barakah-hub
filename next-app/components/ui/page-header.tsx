/**
 * The one page-header convention.
 *
 * Two incompatible header templates used to coexist: English h1 + Urdu
 * subtitle on half the pages, Urdu-only h1 with a small italic English line
 * on the other half — with pb-5 vs pb-6 drift between copies. This settles
 * it: English h1 (the document heading), Urdu counterpart beside it in
 * Nastaliq, optional overline and right-side actions.
 */
export function PageHeader({
  overline,
  title,
  titleUr,
  subtitle,
  actions,
}: {
  /** Small uppercase eyebrow, e.g. "Admin · Loans". */
  overline?: string;
  /** English page title — the page's h1. */
  title: string;
  /** Urdu counterpart, rendered in Nastaliq as the subtitle line. */
  titleUr?: string;
  /** Optional extra line under the title (English). */
  subtitle?: React.ReactNode;
  /** Right-aligned actions (buttons, filters). */
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-5">
      <div>
        {overline && (
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-[var(--txt-4)]">{overline}</div>
        )}
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[var(--color-cream)]">
          {title}
        </h1>
        {titleUr && (
          <p dir="rtl" lang="ur" className="mt-0.5 text-right font-[var(--font-arabic)] text-[15px] leading-8 text-[var(--color-gold-2)] [text-align:start]">
            {titleUr}
          </p>
        )}
        {subtitle && <p className="mt-1 text-sm text-[var(--txt-3)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

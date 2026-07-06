import Link from 'next/link';
import type { Route } from 'next';
import { Download } from 'lucide-react';

/**
 * Plain anchor with `download` — the route handler sets
 * Content-Disposition, so the browser handles save-as without JS.
 * Styled to match the ghost button without pulling Button in (which is a
 * `<button>`, not an anchor; using asChild via Slot adds complexity that
 * the simple, non-cleared download case does not need).
 */
export function ExportLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      download
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--txt-2)] transition-colors hover:border-[var(--color-gold)]/40 hover:bg-[rgba(214,210,199,0.06)] hover:text-[var(--color-gold)]"
    >
      <Download className="size-3.5" aria-hidden="true" />
      {children}
    </Link>
  );
}

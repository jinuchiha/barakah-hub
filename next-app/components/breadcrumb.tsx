'use client';
import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex items-center gap-1 text-[11px] font-medium"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className="size-3 shrink-0"
                style={{ color: 'var(--txt-4)' }}
                aria-hidden
              />
            )}
            {c.href && !isLast ? (
              <Link
                href={c.href as Route}
                className="text-[var(--txt-3)] transition-colors hover:text-[var(--txt-1)]"
              >
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-[var(--txt-2)]' : 'text-[var(--txt-3)]'}>
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

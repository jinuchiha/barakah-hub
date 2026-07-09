import { cn } from '@/lib/utils';
import styles from './skeleton.module.css';

/** Base shimmer block. Compose with width/height utility classes. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn(styles.shimmer, 'rounded-md', className)} style={style} />;
}

/** Mirrors the page header pattern: overline + title (+ optional action). */
export function SkeletonHeaderBar() {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
      <div>
        <Skeleton className="mb-2 h-3 w-32" />
        <Skeleton className="h-7 w-56" />
      </div>
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  );
}

/** Mirrors the StatCard grid used across dashboard/admin pages. */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex min-h-[110px] flex-col justify-between rounded-[var(--radius-r)] border border-[var(--border)] p-5">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors a Card with a header row + N list rows, e.g. CardBody tables/feeds. */
export function SkeletonContentCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius-r)] border border-[var(--border)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="p-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

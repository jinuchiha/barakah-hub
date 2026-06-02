import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />;
}

export function SkeletonText({ width, className }: { width?: string; className?: string }) {
  return <div className={cn('skeleton skeleton-text', className)} style={{ width: width ?? '80%' }} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('skeleton-card', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton skeleton-text w-24" />
        <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 7 }} />
      </div>
      <div className="skeleton skeleton-value mb-2" />
      <div className="skeleton skeleton-text w-16" />
    </div>
  );
}

export function SkeletonStatCards() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
      <div className="skeleton skeleton-avatar" />
      <div className="flex-1 space-y-2">
        <div className="skeleton skeleton-text w-32" />
        <div className="skeleton skeleton-text w-20" />
      </div>
      <div className="skeleton skeleton-text w-16" />
    </div>
  );
}

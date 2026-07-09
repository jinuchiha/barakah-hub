import { Skeleton, SkeletonHeaderBar, SkeletonStatRow, SkeletonContentCard } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <Skeleton className="mb-6 h-3 w-56" />
      <SkeletonHeaderBar />
      <SkeletonStatRow count={3} />
      <div className="mb-4 rounded-[var(--radius-r)] border border-[var(--border)] p-5">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-[180px] w-full rounded-lg" />
      </div>
      <div className="mb-4">
        <SkeletonContentCard rows={3} />
      </div>
      <SkeletonContentCard rows={6} />
    </div>
  );
}

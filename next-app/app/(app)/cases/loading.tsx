import { Skeleton, SkeletonHeaderBar } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <Skeleton className="mb-6 h-3 w-56" />
      <SkeletonHeaderBar />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-[var(--radius-r)] border border-[var(--border)] p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

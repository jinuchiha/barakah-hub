import { Skeleton, SkeletonHeaderBar, SkeletonStatRow, SkeletonContentCard } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <Skeleton className="mb-6 h-3 w-64" />
      <SkeletonHeaderBar />
      <SkeletonStatRow count={4} />
      <div className="mb-6">
        <SkeletonContentCard rows={3} />
      </div>
      <SkeletonContentCard rows={6} />
    </div>
  );
}

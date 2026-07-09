import { Skeleton, SkeletonHeaderBar, SkeletonStatRow, SkeletonContentCard } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <SkeletonHeaderBar />
      <Skeleton className="mb-6 h-32 w-full rounded-2xl" />
      <SkeletonStatRow count={4} />
      <div className="mb-6 grid gap-3 lg:grid-cols-2">
        <SkeletonContentCard rows={3} />
        <SkeletonContentCard rows={3} />
      </div>
      <SkeletonContentCard rows={4} />
    </div>
  );
}

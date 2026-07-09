import { Skeleton, SkeletonHeaderBar } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <SkeletonHeaderBar />
      <div className="rounded-[var(--radius-r)] border border-[var(--border)] p-5">
        <Skeleton className="h-[560px] w-full rounded-xl" />
      </div>
    </div>
  );
}

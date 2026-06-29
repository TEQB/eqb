import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md",
        className,
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
      <Skeleton className="mb-3 h-4 w-16" />
      <Skeleton className="mb-2 h-5 w-40" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

export function SkeletonQuestionRow() {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 shadow-[0_18px_45px_rgba(63,39,50,0.08)] backdrop-blur-xl">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}

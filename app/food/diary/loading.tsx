import { Skeleton } from "@/shared/ui/Skeleton";

export default function FoodDiaryLoading() {
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between pt-6.5 pb-4.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="mb-4 h-14 w-full rounded-xl" />
      <Skeleton className="mb-5 h-14 w-full rounded-2xl" />
      <Skeleton className="mb-3 h-16 w-full rounded-card" />
      <Skeleton className="h-24 w-full rounded-card" />
    </div>
  );
}

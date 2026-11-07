import { Skeleton } from "@/shared/ui/Skeleton";

export default function FoodDietistLoading() {
  return (
    <div className="pt-2">
      <Skeleton className="mt-6.5 mb-4 h-7 w-28" />
      <Skeleton className="mb-4 h-11 w-40 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </div>
    </div>
  );
}

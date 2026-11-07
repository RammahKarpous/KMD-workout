import { Skeleton } from "@/shared/ui/Skeleton";

export default function FoodLimitsLoading() {
  return (
    <div className="pt-2">
      <Skeleton className="mt-6.5 mb-4 h-7 w-40" />
      <Skeleton className="mb-3 h-12 w-full rounded-xl" />
      <Skeleton className="mb-3 h-12 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
